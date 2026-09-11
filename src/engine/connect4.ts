export const ROWS = 6;
export const COLS = 7;
export const CELL_COUNT = ROWS * COLS;
export const OBS_PLANES = 2;
export const OBS_SIZE = CELL_COUNT * OBS_PLANES;

export type Player = 1 | 2;
export type Cell = 0 | Player;
export type Outcome = "ongoing" | "win" | "draw";

export interface PlacedMove {
  row: number;
  col: number;
}

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

/** Mutable Connect Four. Row 0 is the top (display); pieces fall downward. */
export class Connect4 {
  readonly cells: Int8Array;
  currentPlayer: Player = 1;
  outcome: Outcome = "ongoing";
  winner: Player | 0 = 0;
  lastMove: PlacedMove | null = null;
  moveCount = 0;

  constructor() {
    this.cells = new Int8Array(CELL_COUNT);
  }

  reset(firstPlayer: Player = 1): this {
    this.cells.fill(0);
    this.currentPlayer = firstPlayer;
    this.outcome = "ongoing";
    this.winner = 0;
    this.lastMove = null;
    this.moveCount = 0;
    return this;
  }

  clone(): Connect4 {
    const copy = new Connect4();
    copy.cells.set(this.cells);
    copy.currentPlayer = this.currentPlayer;
    copy.outcome = this.outcome;
    copy.winner = this.winner;
    copy.lastMove = this.lastMove ? { ...this.lastMove } : null;
    copy.moveCount = this.moveCount;
    return copy;
  }

  cellAt(row: number, col: number): Cell {
    return this.cells[row * COLS + col] as Cell;
  }

  isColumnOpen(col: number): boolean {
    return col >= 0 && col < COLS && this.cells[col] === 0;
  }

  legalMoves(): number[] {
    const moves: number[] = [];
    for (let col = 0; col < COLS; col++) {
      if (this.cells[col] === 0) {
        moves.push(col);
      }
    }
    return moves;
  }

  /** Length-7 mask: true = column still has space. */
  legalMask(): boolean[] {
    const mask = new Array<boolean>(COLS);
    for (let col = 0; col < COLS; col++) {
      mask[col] = this.cells[col] === 0;
    }
    return mask;
  }

  drop(col: number): PlacedMove {
    if (this.outcome !== "ongoing") {
      throw new Error("Connect4.drop: game is already over");
    }
    if (!this.isColumnOpen(col)) {
      throw new Error(`Connect4.drop: illegal column ${col}`);
    }

    let row = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.cells[r * COLS + col] === 0) {
        row = r;
        break;
      }
    }

    const player = this.currentPlayer;
    this.cells[row * COLS + col] = player;
    this.lastMove = { row, col };
    this.moveCount += 1;

    if (hasWinFrom(this.cells, row, col, player)) {
      this.outcome = "win";
      this.winner = player;
    } else if (this.moveCount === CELL_COUNT) {
      this.outcome = "draw";
      this.winner = 0;
    } else {
      this.currentPlayer = player === 1 ? 2 : 1;
    }

    return this.lastMove;
  }

  /**
   * Observation from `perspective`: plane 0 = own discs, plane 1 = opponent.
   * The policy always sees "me vs them", independent of who started.
   */
  encode(perspective: Player): Float32Array {
    const obs = new Float32Array(OBS_SIZE);
    const opponent: Player = perspective === 1 ? 2 : 1;
    for (let i = 0; i < CELL_COUNT; i++) {
      const cell = this.cells[i];
      if (cell === perspective) {
        obs[i] = 1;
      } else if (cell === opponent) {
        obs[CELL_COUNT + i] = 1;
      }
    }
    return obs;
  }
}

export function hasWinFrom(
  cells: Int8Array,
  row: number,
  col: number,
  player: Player,
): boolean {
  for (const [dr, dc] of DIRS) {
    const count =
      1 +
      countRay(cells, row, col, dr, dc, player) +
      countRay(cells, row, col, -dr, -dc, player);
    if (count >= 4) {
      return true;
    }
  }
  return false;
}

function countRay(
  cells: Int8Array,
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: Player,
): number {
  let n = 0;
  let r = row + dr;
  let c = col + dc;
  while (r >= 0 && r < ROWS && c >= 0 && c < COLS && cells[r * COLS + c] === player) {
    n += 1;
    r += dr;
    c += dc;
  }
  return n;
}

export function opponentOf(player: Player): Player {
  return player === 1 ? 2 : 1;
}
