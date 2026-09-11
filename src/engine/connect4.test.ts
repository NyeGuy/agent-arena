import { describe, expect, it } from "vitest";
import { COLS, Connect4, ROWS } from "./connect4";
import { mulberry32, pick } from "./rng";

function play(env: Connect4, cols: number[]): void {
  for (const col of cols) {
    env.drop(col);
  }
}

describe("Connect4 gravity and legality", () => {
  it("drops pieces to the lowest empty row", () => {
    const env = new Connect4();
    expect(env.drop(3)).toEqual({ row: 5, col: 3 });
    expect(env.cellAt(5, 3)).toBe(1);
    expect(env.drop(3)).toEqual({ row: 4, col: 3 });
    expect(env.cellAt(4, 3)).toBe(2);
  });

  it("lists only open columns as legal", () => {
    const env = new Connect4();
    expect(env.legalMoves()).toEqual([0, 1, 2, 3, 4, 5, 6]);
    // Alternate in one column so nobody gets four vertical.
    for (let i = 0; i < ROWS; i++) {
      env.drop(0);
    }
    expect(env.outcome).toBe("ongoing");
    expect(env.isColumnOpen(0)).toBe(false);
    expect(env.legalMoves()).toEqual([1, 2, 3, 4, 5, 6]);
    expect(env.legalMask()[0]).toBe(false);
  });

  it("rejects moves into a full column", () => {
    const env = new Connect4();
    for (let i = 0; i < ROWS; i++) {
      env.drop(2);
    }
    expect(env.outcome).toBe("ongoing");
    expect(() => env.drop(2)).toThrow(/illegal/);
  });

  it("rejects moves after the game is over", () => {
    const env = new Connect4();
    play(env, [0, 1, 0, 1, 0, 1, 0]);
    expect(env.outcome).toBe("win");
    expect(() => env.drop(2)).toThrow(/already over/);
  });
});

describe("Connect4 win detection", () => {
  it("detects a horizontal win", () => {
    const env = new Connect4();
    play(env, [0, 0, 1, 1, 2, 2, 3]);
    expect(env.outcome).toBe("win");
    expect(env.winner).toBe(1);
  });

  it("detects a vertical win", () => {
    const env = new Connect4();
    play(env, [3, 0, 3, 0, 3, 0, 3]);
    expect(env.outcome).toBe("win");
    expect(env.winner).toBe(1);
    expect(env.lastMove).toEqual({ row: 2, col: 3 });
  });

  it("detects a diagonal down-right win", () => {
    const env = new Connect4();
    play(env, [
      0, 1, 1, 6, 2, 6, 2, 6, 3, 5, 3, 5, 3, 5, 2, 4, 3,
    ]);
    expect(env.outcome).toBe("win");
    expect(env.winner).toBe(1);
  });

  it("detects a diagonal down-left win", () => {
    const env = new Connect4();
    play(env, [
      6, 5, 5, 0, 4, 0, 4, 0, 3, 1, 3, 1, 3, 1, 4, 2, 3,
    ]);
    expect(env.outcome).toBe("win");
    expect(env.winner).toBe(1);
  });

  it("does not count three-in-a-row as a win", () => {
    const env = new Connect4();
    play(env, [0, 0, 1, 1, 2, 2]);
    expect(env.outcome).toBe("ongoing");
    expect(env.winner).toBe(0);
  });
});

describe("Connect4 draw", () => {
  it("declares a draw on a full board with no winner", () => {
    const env = new Connect4();
    const sequence = drawSequence();
    expect(sequence.length).toBe(ROWS * COLS);
    for (const col of sequence) {
      expect(env.outcome).toBe("ongoing");
      env.drop(col);
    }
    expect(env.outcome).toBe("draw");
    expect(env.winner).toBe(0);
    expect(env.legalMoves()).toEqual([]);
    expect(env.moveCount).toBe(42);
  });
});

describe("observation and seeding", () => {
  it("encodes own/opponent planes from the acting perspective", () => {
    const env = new Connect4();
    env.drop(3);
    env.drop(2);
    const fromP1 = env.encode(1);
    const fromP2 = env.encode(2);
    expect(fromP1[5 * COLS + 3]).toBe(1);
    expect(fromP1[ROWS * COLS + 5 * COLS + 2]).toBe(1);
    expect(fromP2[5 * COLS + 2]).toBe(1);
    expect(fromP2[ROWS * COLS + 5 * COLS + 3]).toBe(1);
  });

  it("replays the same random game under the same seed", () => {
    const a = playRandomGame(7);
    const b = playRandomGame(7);
    expect(Array.from(a.cells)).toEqual(Array.from(b.cells));
    expect(a.outcome).toBe(b.outcome);
    expect(a.winner).toBe(b.winner);
    expect(a.moveCount).toBe(b.moveCount);
  });

  it("diverges under a different seed", () => {
    const a = playRandomGame(7);
    const b = playRandomGame(8);
    const same =
      Array.from(a.cells).every((v, i) => v === b.cells[i]) && a.winner === b.winner;
    expect(same).toBe(false);
  });

  it("reset restores an empty first-player-to-move position", () => {
    const env = playRandomGame(3);
    env.reset(1);
    expect(Array.from(env.cells).every((c) => c === 0)).toBe(true);
    expect(env.currentPlayer).toBe(1);
    expect(env.outcome).toBe("ongoing");
    expect(env.moveCount).toBe(0);
  });
});

function playRandomGame(seed: number): Connect4 {
  const env = new Connect4();
  const rng = mulberry32(seed);
  while (env.outcome === "ongoing") {
    env.drop(pick(rng, env.legalMoves()));
  }
  return env;
}

/** Column sequence that fills the board without four in a row. */
function drawSequence(): number[] {
  const cols: number[] = [];
  const pattern = [0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0];
  for (const offset of [0, 2, 4]) {
    for (const c of pattern) {
      cols.push(c + offset);
    }
  }
  cols.push(6, 6, 6, 6, 6, 6);
  return cols;
}
