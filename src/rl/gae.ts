export function computeGAE(
  rewards: number[],
  values: number[],
  dones: number[],
  gamma: number,
  lam: number,
): { advantages: number[]; returns: number[] } {
  const tLen = rewards.length;
  if (values.length !== tLen || dones.length !== tLen) {
    throw new Error("computeGAE: rewards, values, and dones must match");
  }

  const advantages = new Array<number>(tLen);
  let lastGae = 0;
  for (let t = tLen - 1; t >= 0; t--) {
    const nextValue = t === tLen - 1 ? 0 : values[t + 1];
    const nonTerminal = 1 - dones[t];
    const delta = rewards[t] + gamma * nextValue * nonTerminal - values[t];
    lastGae = delta + gamma * lam * nonTerminal * lastGae;
    advantages[t] = lastGae;
  }

  const returns = advantages.map((adv, i) => adv + values[i]);
  return { advantages, returns };
}

export function normalize(values: number[]): number[] {
  if (values.length === 0) {
    return [];
  }
  let sum = 0;
  for (const v of values) {
    sum += v;
  }
  const mean = sum / values.length;
  let varSum = 0;
  for (const v of values) {
    const d = v - mean;
    varSum += d * d;
  }
  const std = Math.sqrt(varSum / values.length) + 1e-8;
  return values.map((v) => (v - mean) / std);
}
