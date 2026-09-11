import { Connect4, type Player } from "../engine/connect4";
import { mulberry32, pick } from "../engine/rng";
import { computeGAE, normalize } from "../rl/gae";
import { PpoAgent } from "../rl/ppo";
import { ensureTfCpu } from "../rl/network";
import { type BoardSnapshot, type TrainProgress, rollingRate } from "./progress";

export interface TrainConfig {
  seed: number;
  gamma: number;
  gaeLambda: number;
  gamesPerUpdate: number;
  maxGames: number;
  progressEvery: number;
  evalEvery: number;
  evalGames: number;
  rollingWindow: number;
  hiddenSize: number;
  learningRate: number;
  clipEpsilon: number;
  entropyCoef: number;
  valueCoef: number;
  ppoEpochs: number;
  minibatchSize: number;
}

export const DEFAULT_TRAIN: TrainConfig = {
  seed: 42,
  gamma: 0.99,
  gaeLambda: 0.95,
  gamesPerUpdate: 32,
  maxGames: Number.POSITIVE_INFINITY,
  progressEvery: 8,
  evalEvery: 200,
  evalGames: 40,
  rollingWindow: 100,
  hiddenSize: 128,
  learningRate: 3e-4,
  clipEpsilon: 0.2,
  entropyCoef: 0.02,
  valueCoef: 0.5,
  ppoEpochs: 4,
  minibatchSize: 256,
};

export interface TrainHooks {
  shouldContinue: () => boolean;
  onProgress: (progress: TrainProgress) => void;
  onSnapshot?: (snapshot: BoardSnapshot) => void;
  yieldFn?: () => Promise<void>;
}

interface Transition {
  obs: Float32Array;
  action: number;
  logp: number;
  value: number;
  reward: number;
  done: number;
  mask: boolean[];
}

export async function runTraining(
  config: Partial<TrainConfig>,
  hooks: TrainHooks,
): Promise<void> {
  const cfg: TrainConfig = { ...DEFAULT_TRAIN, ...config };
  await ensureTfCpu();

  const rng = mulberry32(cfg.seed);
  const agent = new PpoAgent({
    hiddenSize: cfg.hiddenSize,
    learningRate: cfg.learningRate,
    clipEpsilon: cfg.clipEpsilon,
    entropyCoef: cfg.entropyCoef,
    valueCoef: cfg.valueCoef,
    ppoEpochs: cfg.ppoEpochs,
    minibatchSize: cfg.minibatchSize,
  });

  const env = new Connect4();
  const recent: number[] = [];
  let games = 0;
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let lastLoss: number | null = null;
  let lastEntropy: number | null = null;
  let lastEval: number | null = null;
  const started = nowMs();

  const emit = (evalWinRate: number | null = lastEval): void => {
    lastEval = evalWinRate;
    hooks.onProgress({
      games,
      wins,
      losses,
      draws,
      rollingWinRate: rollingRate(recent, cfg.rollingWindow),
      rollingWindow: cfg.rollingWindow,
      entropy: lastEntropy,
      loss: lastLoss,
      evalWinRate,
      evalGames: cfg.evalGames,
      elapsedMs: nowMs() - started,
      algorithm: "ppo",
    });
  };

  try {
    emit(null);

    while (hooks.shouldContinue() && games < cfg.maxGames) {
      const batch: Transition[] = [];

      for (let g = 0; g < cfg.gamesPerUpdate && hooks.shouldContinue() && games < cfg.maxGames; g++) {
        const episode = playEpisode(env, agent, rng, false);
        applyTerminalRewards(episode.steps, episode.result);
        batch.push(...episode.steps);
        games += 1;
        if (episode.result === 1) {
          wins += 1;
        } else if (episode.result === -1) {
          losses += 1;
        } else {
          draws += 1;
        }
        recent.push(episode.result === 1 ? 1 : 0);
        if (recent.length > cfg.rollingWindow * 2) {
          recent.splice(0, recent.length - cfg.rollingWindow);
        }
        hooks.onSnapshot?.({
          cells: Array.from(env.cells),
          lastMove: env.lastMove,
          winner: env.winner,
          agentPlayer: episode.agentPlayer,
        });

        if (games % cfg.progressEvery === 0) {
          emit();
        }
        if (cfg.evalEvery > 0 && games % cfg.evalEvery === 0) {
          lastEval = evaluate(agent, rng, cfg.evalGames);
          emit(lastEval);
        }
      }

      if (batch.length > 0) {
        const rewards = batch.map((t) => t.reward);
        const values = batch.map((t) => t.value);
        const dones = batch.map((t) => t.done);
        const { advantages, returns } = computeGAE(
          rewards,
          values,
          dones,
          cfg.gamma,
          cfg.gaeLambda,
        );
        const stats = agent.update({
          obs: batch.map((t) => t.obs),
          actions: batch.map((t) => t.action),
          oldLogp: batch.map((t) => t.logp),
          advantages: normalize(advantages),
          returns,
          masks: batch.map((t) => t.mask),
        });
        lastLoss = stats.loss;
        lastEntropy = stats.entropy;
      }

      if (hooks.yieldFn) {
        await hooks.yieldFn();
      }
    }

    emit();
  } finally {
    agent.dispose();
  }
}

function playEpisode(
  env: Connect4,
  agent: PpoAgent,
  rng: () => number,
  greedy: boolean,
): { steps: Transition[]; result: number; agentPlayer: Player } {
  const agentPlayer: Player = rng() < 0.5 ? 1 : 2;
  env.reset(1);
  const steps: Transition[] = [];

  while (env.outcome === "ongoing") {
    const mask = env.legalMask();
    if (env.currentPlayer === agentPlayer) {
      const obs = env.encode(agentPlayer);
      const decision = agent.act(obs, mask, rng, greedy);
      env.drop(decision.action);
      steps.push({
        obs,
        action: decision.action,
        logp: decision.logp,
        value: decision.value,
        reward: 0,
        done: 0,
        mask,
      });
    } else {
      env.drop(pick(rng, env.legalMoves()));
    }
  }

  let result = 0;
  if (env.outcome === "win") {
    result = env.winner === agentPlayer ? 1 : -1;
  }
  return { steps, result, agentPlayer };
}

function applyTerminalRewards(steps: Transition[], result: number): void {
  if (steps.length === 0) {
    return;
  }
  const last = steps[steps.length - 1];
  last.reward = result;
  last.done = 1;
}

function evaluate(agent: PpoAgent, rng: () => number, games: number): number {
  const env = new Connect4();
  let wins = 0;
  for (let i = 0; i < games; i++) {
    const { result } = playEpisode(env, agent, rng, true);
    if (result === 1) {
      wins += 1;
    }
  }
  return wins / games;
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
