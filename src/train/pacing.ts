export interface PaceHooks {
  shouldContinue: () => boolean;
  isPaused?: () => boolean;
  moveDelayMs?: () => number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

/**
 * Honor pause immediately and re-read delay so a speed change mid-wait takes effect.
 * At delay 0 this returns as soon as the run is not paused.
 */
export async function waitForTurn(hooks: PaceHooks): Promise<void> {
  const started = nowMs();
  while (hooks.shouldContinue()) {
    if (hooks.isPaused?.()) {
      await sleep(40);
      continue;
    }
    const delay = Math.max(0, hooks.moveDelayMs?.() ?? 0);
    const elapsed = nowMs() - started;
    if (elapsed >= delay) {
      return;
    }
    await sleep(Math.min(40, delay - elapsed));
  }
}
