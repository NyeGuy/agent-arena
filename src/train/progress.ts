import type { Outcome, PlacedMove, Player } from "../engine/connect4";

export type TrainPhase = "playing" | "updating" | "evaluating";

export interface TrainProgress {
  games: number;
  wins: number;
  losses: number;
  draws: number;
  rollingWinRate: number | null;
  rollingWindow: number;
  entropy: number | null;
  loss: number | null;
  evalWinRate: number | null;
  evalGames: number;
  elapsedMs: number;
  algorithm: "ppo";
  phase: TrainPhase;
}

export interface BoardSnapshot {
  cells: number[];
  lastMove: PlacedMove | null;
  winner: Player | 0;
  agentPlayer: Player;
}

/** One visible moment of a training game — board + the policy that produced (or will produce) a drop. */
export interface LiveFrame extends BoardSnapshot {
  outcome: Outcome;
  currentPlayer: Player;
  gameIndex: number;
  moveCount: number;
  /** Masked softmax of the latest agent decision; null if the learner has not acted this game. */
  policy: number[] | null;
  chosenColumn: number | null;
  actor: "agent" | "random" | "none";
  /** True when the heat strip is showing a sampled column that has not dropped yet. */
  pending: boolean;
}

export interface WinRatePoint {
  games: number;
  rate: number;
}

export function appendPoint(history: WinRatePoint[], point: WinRatePoint): WinRatePoint[] {
  if (history.length > 0 && history[history.length - 1].games === point.games) {
    const next = history.slice();
    next[next.length - 1] = point;
    return next;
  }
  return [...history, point];
}

export function rollingRate(results: number[], window: number): number | null {
  if (results.length === 0) {
    return null;
  }
  const slice = results.length > window ? results.slice(-window) : results;
  let wins = 0;
  for (const r of slice) {
    if (r === 1) {
      wins += 1;
    }
  }
  return wins / slice.length;
}
