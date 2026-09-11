import { chartCoords, downsample, toPolyline } from "./chartMath";
import type { WinRatePoint } from "../train/progress";

const WIDTH = 640;
const HEIGHT = 176;
const PAD = { l: 40, r: 16, t: 16, b: 30 };

export function WinRateChart({
  history,
  window,
}: {
  history: WinRatePoint[];
  window: number;
}) {
  const innerW = WIDTH - PAD.l - PAD.r;
  const innerH = HEIGHT - PAD.t - PAD.b;
  const points = downsample(history, 360);
  const last = points[points.length - 1];
  const maxGames = Math.max(window, last?.games ?? window);
  const coords = chartCoords(points, innerW, innerH, maxGames);
  const shifted = coords.map((c) => ({ x: c.x + PAD.l, y: c.y + PAD.t }));
  const line = toPolyline(shifted);
  const chanceY = PAD.t + innerH * 0.5;
  const latest = last ? `${(last.rate * 100).toFixed(0)}%` : null;

  return (
    <figure className="chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={
          last
            ? `Win rate over time. ${Math.round(last.rate * 100)} percent after ${last.games} games.`
            : "Win rate over time. No games yet."
        }
      >
        <line className="chart-grid" x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + innerH} />
        <line
          className="chart-grid"
          x1={PAD.l}
          y1={PAD.t + innerH}
          x2={PAD.l + innerW}
          y2={PAD.t + innerH}
        />
        <line className="chart-chance" x1={PAD.l} y1={chanceY} x2={PAD.l + innerW} y2={chanceY} />
        <text className="chart-axis" x={PAD.l - 8} y={PAD.t + 4} textAnchor="end">
          100%
        </text>
        <text className="chart-axis chart-chance-label" x={PAD.l - 8} y={chanceY + 4} textAnchor="end">
          50%
        </text>
        <text className="chart-axis" x={PAD.l - 8} y={PAD.t + innerH + 4} textAnchor="end">
          0%
        </text>
        <text className="chart-axis" x={PAD.l} y={HEIGHT - 8}>
          games
        </text>
        <text className="chart-axis" x={PAD.l + innerW} y={HEIGHT - 8} textAnchor="end">
          {maxGames}
        </text>
        {line ? (
          <polyline className="chart-line" points={line} />
        ) : (
          <text className="chart-empty" x={PAD.l + innerW / 2} y={PAD.t + innerH / 2} textAnchor="middle">
            Train to see the win rate leave chance.
          </text>
        )}
        {shifted.length === 1 ? (
          <circle className="chart-dot" cx={shifted[0].x} cy={shifted[0].y} r="3.5" />
        ) : null}
        {latest && last ? (
          <text className="chart-latest" x={PAD.l + innerW} y={PAD.t + 12} textAnchor="end">
            {latest} after {last.games}
          </text>
        ) : null}
      </svg>
    </figure>
  );
}
