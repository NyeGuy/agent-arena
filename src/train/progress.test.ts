import { describe, expect, it } from "vitest";
import { appendPoint, rollingRate } from "./progress";

describe("rollingRate", () => {
  it("returns null when empty", () => {
    expect(rollingRate([], 100)).toBeNull();
  });

  it("uses the last window only", () => {
    const results = [...Array(80).fill(0), ...Array(100).fill(1)];
    expect(rollingRate(results, 100)).toBe(1);
  });
});

describe("appendPoint", () => {
  it("replaces the last point when the game count matches", () => {
    const first = appendPoint([], { games: 8, rate: 0.5 });
    const second = appendPoint(first, { games: 8, rate: 0.6 });
    expect(second).toEqual([{ games: 8, rate: 0.6 }]);
  });

  it("appends when games move forward", () => {
    const hist = appendPoint([{ games: 8, rate: 0.5 }], { games: 16, rate: 0.55 });
    expect(hist).toHaveLength(2);
  });
});
