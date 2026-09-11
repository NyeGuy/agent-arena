const NEG_INF = -1e9;

export function maskedLogits(logits: ArrayLike<number>, mask: boolean[]): number[] {
  const out = new Array<number>(mask.length);
  for (let i = 0; i < mask.length; i++) {
    out[i] = mask[i] ? logits[i] : NEG_INF;
  }
  return out;
}

export function logProbMasked(
  logits: ArrayLike<number>,
  mask: boolean[],
  action: number,
): number {
  if (!mask[action]) {
    throw new Error(`logProbMasked: illegal action ${action}`);
  }
  let max = -Infinity;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && logits[i] > max) {
      max = logits[i];
    }
  }
  let sumExp = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      sumExp += Math.exp(logits[i] - max);
    }
  }
  return logits[action] - max - Math.log(sumExp);
}

export function entropyMasked(logits: ArrayLike<number>, mask: boolean[]): number {
  let max = -Infinity;
  let legal = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      legal += 1;
      if (logits[i] > max) {
        max = logits[i];
      }
    }
  }
  if (legal === 0) {
    return 0;
  }
  let sumExp = 0;
  const weights = new Array<number>(mask.length).fill(0);
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      const w = Math.exp(logits[i] - max);
      weights[i] = w;
      sumExp += w;
    }
  }
  let entropy = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      const p = weights[i] / sumExp;
      entropy -= p * Math.log(p + 1e-12);
    }
  }
  return entropy;
}

export function sampleMasked(
  logits: ArrayLike<number>,
  mask: boolean[],
  rng: () => number,
): number {
  let max = -Infinity;
  const legal: number[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]) {
      legal.push(i);
      if (logits[i] > max) {
        max = logits[i];
      }
    }
  }
  if (legal.length === 0) {
    throw new Error("sampleMasked: no legal actions");
  }
  let sumExp = 0;
  const weights = new Array<number>(legal.length);
  for (let i = 0; i < legal.length; i++) {
    const w = Math.exp(logits[legal[i]] - max);
    weights[i] = w;
    sumExp += w;
  }
  let r = rng() * sumExp;
  for (let i = 0; i < legal.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      return legal[i];
    }
  }
  return legal[legal.length - 1];
}

export function argmaxMasked(logits: ArrayLike<number>, mask: boolean[]): number {
  let best = -1;
  let bestVal = -Infinity;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && logits[i] > bestVal) {
      bestVal = logits[i];
      best = i;
    }
  }
  if (best < 0) {
    throw new Error("argmaxMasked: no legal actions");
  }
  return best;
}
