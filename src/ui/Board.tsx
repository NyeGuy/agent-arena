import { COLS, ROWS } from "../engine/connect4";
import type { LiveFrame } from "../train/progress";

export function Board({ frame }: { frame: LiveFrame | null }) {
  const cells = frame?.cells ?? Array<number>(ROWS * COLS).fill(0);
  const last = frame?.lastMove;
  const ghost = pendingGhost(frame);

  const label = frame
    ? `Connect Four, game ${frame.gameIndex}. Learner is ${frame.agentPlayer === 1 ? "red" : "yellow"}. ${outcomeLine(frame)}`
    : "Empty Connect Four board";

  return (
    <div className="board stage-grid" role="img" aria-label={label}>
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const v = cells[i];
        const isLast = last !== null && last !== undefined && last.row === row && last.col === col;
        const isGhost = ghost !== null && ghost.row === row && ghost.col === col;
        const cls = [
          "cell",
          v === 1 ? "p1" : "",
          v === 2 ? "p2" : "",
          isLast ? "last" : "",
          isGhost ? (frame!.agentPlayer === 1 ? "ghost p1" : "ghost p2") : "",
        ]
          .filter(Boolean)
          .join(" ");
        return <div key={i} className={cls} />;
      })}
    </div>
  );
}

function pendingGhost(frame: LiveFrame | null): { row: number; col: number } | null {
  if (!frame?.pending || frame.chosenColumn === null) {
    return null;
  }
  const col = frame.chosenColumn;
  for (let row = ROWS - 1; row >= 0; row--) {
    if (frame.cells[row * COLS + col] === 0) {
      return { row, col };
    }
  }
  return null;
}

function outcomeLine(frame: LiveFrame): string {
  if (frame.outcome === "win") {
    return frame.winner === frame.agentPlayer ? "Learner won." : "Random won.";
  }
  if (frame.outcome === "draw") {
    return "Draw.";
  }
  return frame.pending ? "Learner is about to drop." : "Game in progress.";
}
