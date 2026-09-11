import { describe, expect, it } from "vitest";
import { computeGAE, normalize } from "./gae";

describe("computeGAE", () => {
  it("reduces to the discounted return when lambda = 1 and values are 0", () => {
    const { advantages, returns } = computeGAE(
      [0, 0, 1],
      [0, 0, 0],
      [0, 0, 1],
      0.99,
      1,
    );
    expect(returns[2]).toBeCloseTo(1);
    expect(returns[1]).toBeCloseTo(0.99);
    expect(returns[0]).toBeCloseTo(0.99 * 0.99);
    expect(advantages).toEqual(returns);
  });

  it("cuts the backup at episode boundaries", () => {
    const { advantages } = computeGAE(
      [1, 1],
      [0, 0],
      [1, 1],
      0.9,
      0.95,
    );
    expect(advantages[0]).toBeCloseTo(1);
    expect(advantages[1]).toBeCloseTo(1);
  });
});

describe("normalize", () => {
  it("centers and scales a batch", () => {
    const out = normalize([1, 2, 3]);
    const mean = out.reduce((a, b) => a + b, 0) / out.length;
    expect(mean).toBeCloseTo(0);
    expect(out[0]).toBeLessThan(0);
    expect(out[2]).toBeGreaterThan(0);
  });
});
