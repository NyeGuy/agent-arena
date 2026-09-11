/**
 * Headless PPO vs Random on the same loop the browser worker uses.
 * Prints a markdown table for PHASE0.md.
 */
import { Connect4, type Player } from "../src/engine/connect4";
import { mulberry32, pick } from "../src/engine/rng";
import { runTraining } from "../src/train/loop";
import type { TrainProgress } from "../src/train/progress";

const SEED = 42;
const MAX_GAMES = 800;
const CHECKPOINTS = new Set([0, 50, 100, 200, 400, 600, 800]);

function randomVsRandom(games: number, seed: number): { p1: number; draws: number } {
  const rng = mulberry32(seed);
  const env = new Connect4();
  let p1 = 0;
  let draws = 0;
  for (let i = 0; i < games; i++) {
    env.reset(1);
    while (env.outcome === "ongoing") {
      env.drop(pick(rng, env.legalMoves()));
    }
    if (env.outcome === "draw") {
      draws += 1;
    } else if (env.winner === 1) {
      p1 += 1;
    }
  }
  return { p1, draws };
}

function seatedRandom(games: number, seed: number): number {
  const rng = mulberry32(seed);
  const env = new Connect4();
  let wins = 0;
  for (let i = 0; i < games; i++) {
    const agent: Player = rng() < 0.5 ? 1 : 2;
    env.reset(1);
    while (env.outcome === "ongoing") {
      env.drop(pick(rng, env.legalMoves()));
    }
    if (env.outcome === "win" && env.winner === agent) {
      wins += 1;
    }
  }
  return wins / games;
}

async function main(): Promise<void> {
  const baselineGames = 400;
  const seated = seatedRandom(baselineGames, 1);
  const rvr = randomVsRandom(baselineGames, 2);
  console.log("## Baseline (no learning)");
  console.log(`- Random vs Random over ${baselineGames} games (P1 win rate): ${(rvr.p1 / baselineGames * 100).toFixed(1)}%`);
  console.log(`- Draws: ${(rvr.draws / baselineGames * 100).toFixed(1)}%`);
  console.log(`- Random seated as either color (matches training seating): ${(seated * 100).toFixed(1)}%`);
  console.log("");
  const rows: TrainProgress[] = [];

  await runTraining(
    {
      seed: SEED,
      maxGames: MAX_GAMES,
      progressEvery: 50,
      evalEvery: 200,
      evalGames: 40,
      gamesPerUpdate: 32,
    },
    {
      shouldContinue: () => true,
      onProgress: (p) => {
        if (!(CHECKPOINTS.has(p.games) || p.games === MAX_GAMES)) {
          return;
        }
        const existing = rows.findIndex((r) => r.games === p.games);
        if (existing >= 0) {
          rows[existing] = p;
        } else {
          rows.push(p);
        }
      },
    },
  );

  console.log(`## PPO vs Random (seed ${SEED}, maxGames ${MAX_GAMES})`);
  console.log("");
  console.log("| games | rolling win rate | eval win rate | entropy | elapsed |");
  console.log("| ---: | ---: | ---: | ---: | ---: |");
  for (const p of rows) {
    const roll = p.rollingWinRate === null ? "—" : `${(p.rollingWinRate * 100).toFixed(1)}%`;
    const ev = p.evalWinRate === null ? "—" : `${(p.evalWinRate * 100).toFixed(1)}%`;
    const ent = p.entropy === null ? "—" : p.entropy.toFixed(3);
    const elapsed = `${(p.elapsedMs / 1000).toFixed(1)}s`;
    console.log(`| ${p.games} | ${roll} | ${ev} | ${ent} | ${elapsed} |`);
  }

  const last = rows[rows.length - 1];
  if (!last || last.rollingWinRate === null || last.rollingWinRate < 0.6) {
    console.error("\nCONVERGENCE CHECK FAILED: rolling win rate did not clear 60% vs Random.");
    process.exitCode = 1;
  } else {
    console.log("\nCONVERGENCE CHECK PASSED: rolling win rate clearly above random.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
