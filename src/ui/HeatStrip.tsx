import { COLS } from "../engine/connect4";
import type { LiveFrame } from "../train/progress";

export function HeatStrip({ frame }: { frame: LiveFrame | null }) {
  const policy = frame?.policy;
  const maskLegal = legalFromCells(frame?.cells);
  const chosen = frame?.chosenColumn ?? null;
  const agentClass = frame?.agentPlayer === 2 ? "p2" : "p1";

  const aria = policy
    ? `Column probabilities: ${policy.map((p, i) => `${i + 1} ${Math.round(p * 100)} percent`).join(", ")}`
    : "No column probabilities yet — waiting for the learner's turn.";

  return (
    <div className={`heat stage-grid ${agentClass}`} role="img" aria-label={aria}>
      {Array.from({ length: COLS }, (_, col) => {
        const p = policy?.[col] ?? 0;
        const legal = maskLegal[col];
        const isChosen = chosen === col && policy !== null;
        const height = !legal || !policy ? 0 : p * 100;
        return (
          <div key={col} className={`heat-col${isChosen ? " chosen" : ""}${legal ? "" : " full"}`}>
            <div className="heat-track">
              <div
                className="heat-bar"
                style={{ height: `${height}%`, minHeight: p > 0 && legal ? 3 : 0 }}
              />
            </div>
            <span className="heat-pct">{!policy ? "—" : legal ? `${Math.round(p * 100)}%` : "full"}</span>
          </div>
        );
      })}
    </div>
  );
}

function legalFromCells(cells: number[] | undefined): boolean[] {
  const mask = new Array<boolean>(COLS).fill(true);
  if (!cells) {
    return mask;
  }
  for (let col = 0; col < COLS; col++) {
    mask[col] = cells[col] === 0;
  }
  return mask;
}
