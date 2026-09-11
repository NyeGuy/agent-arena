import { describe, expect, it } from "vitest";
import { rollingRate } from "./progress";

describe("rollingRate", () => {
  it("returns null when empty", () => {
    expect(rollingRate([], 100)).toBeNull();
  });

  it("uses the last window only", () => {
    const results = [...Array(80).fill(0), ...Array(100).fill(1)];
    expect(rollingRate(results, 100)).toBe(1);
  });
});
