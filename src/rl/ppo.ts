import * as tf from "@tensorflow/tfjs";
import { COLS, OBS_SIZE } from "../engine/connect4";
import { createActorCritic, predictLogitsValue, type ActorCritic } from "./network";
import { argmaxMasked, entropyMasked, logProbMasked, sampleMasked, softmaxProbs } from "./mask";

export interface PpoHyperparams {
  hiddenSize: number;
  learningRate: number;
  clipEpsilon: number;
  entropyCoef: number;
  valueCoef: number;
  ppoEpochs: number;
  minibatchSize: number;
}

export const DEFAULT_PPO: PpoHyperparams = {
  hiddenSize: 128,
  learningRate: 3e-4,
  clipEpsilon: 0.2,
  entropyCoef: 0.02,
  valueCoef: 0.5,
  ppoEpochs: 4,
  minibatchSize: 256,
};

export interface RolloutBatch {
  obs: Float32Array[];
  actions: number[];
  oldLogp: number[];
  advantages: number[];
  returns: number[];
  masks: boolean[][];
}

export interface ActResult {
  action: number;
  logp: number;
  value: number;
  entropy: number;
  /** Masked softmax over the seven columns — same distribution `action` was drawn from. */
  probs: number[];
}

export class PpoAgent {
  readonly net: ActorCritic;
  readonly optimizer: tf.AdamOptimizer;
  readonly hp: PpoHyperparams;
  lastEntropy = 0;

  constructor(hp: Partial<PpoHyperparams> = {}) {
    this.hp = { ...DEFAULT_PPO, ...hp };
    this.net = createActorCritic(this.hp.hiddenSize);
    this.optimizer = tf.train.adam(this.hp.learningRate);
  }

  act(
    obs: Float32Array,
    mask: boolean[],
    rng: () => number,
    greedy = false,
  ): ActResult {
    const { logits, value } = predictLogitsValue(this.net.model, obs);
    const action = greedy ? argmaxMasked(logits, mask) : sampleMasked(logits, mask, rng);
    const logp = logProbMasked(logits, mask, action);
    const entropy = entropyMasked(logits, mask);
    const probs = softmaxProbs(logits, mask);
    this.lastEntropy = entropy;
    return { action, logp, value, entropy, probs };
  }

  update(batch: RolloutBatch): { loss: number; entropy: number } {
    const n = batch.actions.length;
    if (n === 0) {
      return { loss: 0, entropy: this.lastEntropy };
    }

    const obsFlat = new Float32Array(n * OBS_SIZE);
    const maskFlat = new Float32Array(n * COLS);
    for (let i = 0; i < n; i++) {
      obsFlat.set(batch.obs[i], i * OBS_SIZE);
      const m = batch.masks[i];
      for (let c = 0; c < COLS; c++) {
        maskFlat[i * COLS + c] = m[c] ? 1 : 0;
      }
    }

    const obsT = tf.tensor2d(obsFlat, [n, OBS_SIZE]);
    const maskT = tf.tensor2d(maskFlat, [n, COLS]);
    const actionsT = tf.tensor1d(batch.actions, "int32");
    const oldLogpT = tf.tensor1d(batch.oldLogp);
    const advT = tf.tensor1d(batch.advantages);
    const retT = tf.tensor1d(batch.returns);

    let lastLoss = 0;
    let lastEntropy = 0;
    const indices = Array.from({ length: n }, (_, i) => i);
    const mb = Math.min(this.hp.minibatchSize, n);

    try {
      for (let epoch = 0; epoch < this.hp.ppoEpochs; epoch++) {
        shuffleInPlace(indices);
        for (let start = 0; start < n; start += mb) {
          const end = Math.min(start + mb, n);
          const slice = indices.slice(start, end);
          const idxT = tf.tensor1d(slice, "int32");
          const mbObs = tf.gather(obsT, idxT);
          const mbMask = tf.gather(maskT, idxT);
          const mbAct = tf.gather(actionsT, idxT);
          const mbOld = tf.gather(oldLogpT, idxT);
          const mbAdv = tf.gather(advT, idxT);
          const mbRet = tf.gather(retT, idxT);
          idxT.dispose();

          const cost = this.optimizer.minimize(() => {
            const outputs = this.net.model.apply(mbObs, { training: true }) as tf.Tensor[];
            const logits = outputs[0];
            const values = outputs[1];
            const negInf = tf.fill(logits.shape, -1e9);
            const masked = tf.where(mbMask.greater(0.5), logits, negInf);
            const logProbs = tf.logSoftmax(masked);
            const oneHot = tf.oneHot(mbAct, COLS);
            const newLogp = tf.sum(tf.mul(logProbs, oneHot), 1);
            const ratio = tf.exp(tf.sub(newLogp, mbOld));
            const clipped = tf.clipByValue(
              ratio,
              1 - this.hp.clipEpsilon,
              1 + this.hp.clipEpsilon,
            );
            const surr1 = tf.mul(ratio, mbAdv);
            const surr2 = tf.mul(clipped, mbAdv);
            const policyLoss = tf.neg(tf.mean(tf.minimum(surr1, surr2)));
            const v = tf.squeeze(values);
            const valueLoss = tf.mul(tf.mean(tf.square(tf.sub(v, mbRet))), this.hp.valueCoef);
            const probs = tf.softmax(masked);
            const safeLog = tf.where(mbMask.greater(0.5), logProbs, tf.zerosLike(logProbs));
            const entropy = tf.neg(tf.sum(tf.mul(probs, safeLog), 1));
            const entropyMean = tf.mean(entropy);
            lastEntropy = entropyMean.dataSync()[0];
            const total = tf.sub(tf.add(policyLoss, valueLoss), tf.mul(entropyMean, this.hp.entropyCoef));
            lastLoss = total.dataSync()[0];
            return total as tf.Scalar;
          }, true);

          if (cost) {
            lastLoss = cost.dataSync()[0];
            cost.dispose();
          }
          mbObs.dispose();
          mbMask.dispose();
          mbAct.dispose();
          mbOld.dispose();
          mbAdv.dispose();
          mbRet.dispose();
        }
      }
    } finally {
      obsT.dispose();
      maskT.dispose();
      actionsT.dispose();
      oldLogpT.dispose();
      advT.dispose();
      retT.dispose();
    }

    this.lastEntropy = lastEntropy;
    return { loss: lastLoss, entropy: lastEntropy };
  }

  dispose(): void {
    this.net.model.dispose();
    this.optimizer.dispose();
  }
}

function shuffleInPlace(arr: number[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}
