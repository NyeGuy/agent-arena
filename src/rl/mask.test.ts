import { describe, expect, it } from "vitest";
import { entropyMasked, logProbMasked, sampleMasked } from "./mask";

describe("action masking", () => {
  it("puts zero probability on illegal actions", () => {
    const logits = [0, 0, 0, 10, 0, 0, 0];
    const mask = [false, true, true, false, true, true, true];
    const counts = new Array(7).fill(0);
    const rng = (() => {
      let x = 1;
      return () => {
        x = (x * 16807) % 2147483647;
        return (x - 1) / 2147483646;
      };
    })();
    for (let i = 0; i < 2000; i++) {
      counts[sampleMasked(logits, mask, rng)] += 1;
    }
    expect(counts[0]).toBe(0);
    expect(counts[3]).toBe(0);
    expect(counts.slice(0).reduce((a, b) => a + b, 0)).toBe(2000);
  });

  it("returns a valid log-prob for a legal action", () => {
    const logits = [1, 1, 1, 1, 1, 1, 1];
    const mask = [true, true, false, false, false, false, false];
    const lp = logProbMasked(logits, mask, 0);
    expect(lp).toBeCloseTo(-Math.log(2));
    expect(() => logProbMasked(logits, mask, 2)).toThrow(/illegal/);
  });

  it("entropy of a deterministic legal action is ~0", () => {
    const logits = [0, 50, 0, 0, 0, 0, 0];
    const mask = [true, true, true, true, true, true, true];
    expect(entropyMasked(logits, mask)).toBeCloseTo(0, 4);
  });
});
