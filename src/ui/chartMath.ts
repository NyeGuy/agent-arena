import type { WinRatePoint } from "../train/progress";

export function downsample<T>(items: T[], max: number): T[] {
  if (items.length <= max) {
    return items;
  }
  const stride = Math.ceil(items.length / max);
  const out: T[] = [];
  for (let i = 0; i < items.length; i += stride) {
    out.push(items[i]);
  }
  const last = items[items.length - 1];
  if (out[out.length - 1] !== last) {
    out.push(last);
  }
  return out;
}

export function chartCoords(
  points: WinRatePoint[],
  width: number,
  height: number,
  maxGames: number,
): { x: number; y: number }[] {
  if (maxGames <= 0 || width <= 0 || height <= 0) {
    return [];
  }
  return points.map((p) => ({
    x: (p.games / maxGames) * width,
    y: height - p.rate * height,
  }));
}

export function toPolyline(coords: { x: number; y: number }[]): string {
  return coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
}
