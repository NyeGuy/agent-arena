import { describe, expect, it } from "vitest";
import { waitForTurn } from "./pacing";

describe("waitForTurn", () => {
  it("returns immediately when not paused and delay is 0", async () => {
    const t0 = Date.now();
    await waitForTurn({ shouldContinue: () => true, moveDelayMs: () => 0 });
    expect(Date.now() - t0).toBeLessThan(80);
  });

  it("stops waiting when the run is aborted", async () => {
    let live = true;
    setTimeout(() => {
      live = false;
    }, 20);
    const t0 = Date.now();
    await waitForTurn({
      shouldContinue: () => live,
      isPaused: () => true,
      moveDelayMs: () => 5000,
    });
    expect(Date.now() - t0).toBeLessThan(200);
  });
});
