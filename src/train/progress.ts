import type { PlacedMove, Player } from "../engine/connect4";

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
}

export interface BoardSnapshot {
  cells: number[];
  lastMove: PlacedMove | null;
  winner: Player | 0;
  agentPlayer: Player;
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
