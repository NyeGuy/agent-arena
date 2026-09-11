import { describe, expect, it } from "vitest";
import { chartCoords, downsample, toPolyline } from "./chartMath";

describe("downsample", () => {
  it("keeps short series intact and always keeps the last point", () => {
    expect(downsample([1, 2, 3], 10)).toEqual([1, 2, 3]);
    const long = Array.from({ length: 10 }, (_, i) => i);
    const slim = downsample(long, 4);
    expect(slim[0]).toBe(0);
    expect(slim[slim.length - 1]).toBe(9);
    expect(slim.length).toBeLessThanOrEqual(5);
  });
});

describe("chartCoords", () => {
  it("maps chance to mid-height and the last game to the right edge", () => {
    const pts = chartCoords(
      [
        { games: 0, rate: 0.5 },
        { games: 100, rate: 1 },
      ],
      200,
      100,
      100,
    );
    expect(pts[0]).toEqual({ x: 0, y: 50 });
    expect(pts[1]).toEqual({ x: 200, y: 0 });
    expect(toPolyline(pts)).toBe("0.0,50.0 200.0,0.0");
  });
});
