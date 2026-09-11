import { Connect4, type Player } from "../engine/connect4";
import { mulberry32, pick } from "../engine/rng";
import { computeGAE, normalize } from "../rl/gae";
import { PpoAgent } from "../rl/ppo";
import { ensureTfCpu } from "../rl/network";
import { waitForTurn, type PaceHooks } from "./pacing";
import {
  type LiveFrame,
  type TrainPhase,
  type TrainProgress,
  rollingRate,
} from "./progress";

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
  progressEvery: 1,
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

export interface TrainHooks extends PaceHooks {
  onProgress: (progress: TrainProgress) => void;
  onLiveFrame?: (frame: LiveFrame) => void;
  onPhase?: (phase: TrainPhase) => void;
  emitLive?: () => boolean;
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
  let phase: TrainPhase = "playing";
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
      phase,
    });
  };

  const setPhase = (next: TrainPhase): void => {
    phase = next;
    hooks.onPhase?.(next);
  };

  try {
    emit(null);

    while (hooks.shouldContinue() && games < cfg.maxGames) {
      const batch: Transition[] = [];
      setPhase("playing");

      for (let g = 0; g < cfg.gamesPerUpdate && hooks.shouldContinue() && games < cfg.maxGames; g++) {
        const episode = await playEpisode(env, agent, rng, false, hooks, games + 1);
        if (!episode) {
          break;
        }
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
        if (games % cfg.progressEvery === 0) {
          if (!hooks.emitLive?.()) {
            hooks.onLiveFrame?.(
              makeFrame(env, {
                agentPlayer: episode.agentPlayer,
                gameIndex: games,
                policy: episode.lastPolicy,
                chosenColumn: episode.lastAction,
                actor: "none",
                pending: false,
              }),
            );
          }
          emit();
        }
        if (cfg.evalEvery > 0 && games % cfg.evalEvery === 0) {
          setPhase("evaluating");
          lastEval = await evaluate(agent, rng, cfg.evalGames, hooks);
          setPhase("playing");
          emit(lastEval);
        }
        if (hooks.yieldFn && !hooks.emitLive?.()) {
          await hooks.yieldFn();
        }
      }

      if (batch.length > 0 && hooks.shouldContinue()) {
        setPhase("updating");
        emit();
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
        setPhase("playing");
        emit();
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

interface EpisodeResult {
  steps: Transition[];
  result: number;
  agentPlayer: Player;
  lastPolicy: number[] | null;
  lastAction: number | null;
}

async function playEpisode(
  env: Connect4,
  agent: PpoAgent,
  rng: () => number,
  greedy: boolean,
  hooks?: TrainHooks,
  gameIndex = 0,
): Promise<EpisodeResult | null> {
  const live = Boolean(hooks?.emitLive?.() && hooks.onLiveFrame && !greedy);
  const agentPlayer: Player = rng() < 0.5 ? 1 : 2;
  env.reset(1);
  const steps: Transition[] = [];
  let lastPolicy: number[] | null = null;
  let lastAction: number | null = null;

  if (live) {
    hooks!.onLiveFrame!(
      makeFrame(env, {
        agentPlayer,
        gameIndex,
        policy: null,
        chosenColumn: null,
        actor: "none",
        pending: false,
      }),
    );
  }

  while (env.outcome === "ongoing") {
    if (hooks) {
      await waitForTurn(hooks);
    }
    if (hooks && !hooks.shouldContinue()) {
      return null;
    }

    const mask = env.legalMask();
    if (env.currentPlayer === agentPlayer) {
      const obs = env.encode(agentPlayer);
      const decision = agent.act(obs, mask, rng, greedy);
      lastPolicy = decision.probs;
      lastAction = decision.action;
      if (live) {
        hooks!.onLiveFrame!(
          makeFrame(env, {
            agentPlayer,
            gameIndex,
            policy: decision.probs,
            chosenColumn: decision.action,
            actor: "agent",
            pending: true,
          }),
        );
        await waitForTurn(hooks!);
        if (!hooks!.shouldContinue()) {
          return null;
        }
      }
      env.drop(decision.action);
      if (live) {
        hooks!.onLiveFrame!(
          makeFrame(env, {
            agentPlayer,
            gameIndex,
            policy: decision.probs,
            chosenColumn: decision.action,
            actor: "agent",
            pending: false,
          }),
        );
      }
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
      const col = pick(rng, env.legalMoves());
      env.drop(col);
      if (live) {
        hooks!.onLiveFrame!(
          makeFrame(env, {
            agentPlayer,
            gameIndex,
            policy: lastPolicy,
            chosenColumn: lastAction,
            actor: "random",
            pending: false,
          }),
        );
      }
    }
  }

  let result = 0;
  if (env.outcome === "win") {
    result = env.winner === agentPlayer ? 1 : -1;
  }
  return { steps, result, agentPlayer, lastPolicy, lastAction };
}

function applyTerminalRewards(steps: Transition[], result: number): void {
  if (steps.length === 0) {
    return;
  }
  const last = steps[steps.length - 1];
  last.reward = result;
  last.done = 1;
}

async function evaluate(
  agent: PpoAgent,
  rng: () => number,
  games: number,
  hooks: TrainHooks,
): Promise<number> {
  const env = new Connect4();
  let wins = 0;
  let played = 0;
  for (let i = 0; i < games; i++) {
    if (!hooks.shouldContinue()) {
      break;
    }
    while (hooks.isPaused?.() && hooks.shouldContinue()) {
      await waitForTurn(hooks);
    }
    const episode = await playEpisode(env, agent, rng, true);
    if (!episode) {
      break;
    }
    played += 1;
    if (episode.result === 1) {
      wins += 1;
    }
    if (hooks.yieldFn && i % 5 === 0) {
      await hooks.yieldFn();
    }
  }
  return played === 0 ? 0 : wins / played;
}

function makeFrame(
  env: Connect4,
  extra: {
    agentPlayer: Player;
    gameIndex: number;
    policy: number[] | null;
    chosenColumn: number | null;
    actor: LiveFrame["actor"];
    pending: boolean;
  },
): LiveFrame {
  return {
    cells: Array.from(env.cells),
    lastMove: env.lastMove,
    winner: env.winner,
    outcome: env.outcome,
    agentPlayer: extra.agentPlayer,
    currentPlayer: env.currentPlayer,
    gameIndex: extra.gameIndex,
    moveCount: env.moveCount,
    policy: extra.policy,
    chosenColumn: extra.chosenColumn,
    actor: extra.actor,
    pending: extra.pending,
  };
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
