import * as tf from "@tensorflow/tfjs";
import { COLS, OBS_SIZE } from "../engine/connect4";

export interface ActorCritic {
  model: tf.LayersModel;
  hiddenSize: number;
}

export function createActorCritic(hiddenSize = 128): ActorCritic {
  const input = tf.input({ shape: [OBS_SIZE], name: "obs" });
  const h1 = tf.layers
    .dense({ units: hiddenSize, activation: "tanh", name: "h1" })
    .apply(input) as tf.SymbolicTensor;
  const h2 = tf.layers
    .dense({ units: hiddenSize, activation: "tanh", name: "h2" })
    .apply(h1) as tf.SymbolicTensor;
  const logits = tf.layers
    .dense({ units: COLS, name: "logits" })
    .apply(h2) as tf.SymbolicTensor;
  const value = tf.layers
    .dense({ units: 1, name: "value" })
    .apply(h2) as tf.SymbolicTensor;
  const model = tf.model({ inputs: input, outputs: [logits, value] });
  return { model, hiddenSize };
}

export async function ensureTfCpu(): Promise<void> {
  await tf.ready();
  if (tf.getBackend() !== "cpu") {
    await tf.setBackend("cpu");
    await tf.ready();
  }
}

export function predictLogitsValue(
  model: tf.LayersModel,
  obs: Float32Array,
): { logits: Float32Array; value: number } {
  return tf.tidy(() => {
    const x = tf.tensor2d(obs, [1, OBS_SIZE]);
    const outputs = model.predict(x) as tf.Tensor[];
    const logitData = outputs[0].dataSync();
    const valueData = outputs[1].dataSync();
    return {
      logits: Float32Array.from(logitData),
      value: valueData[0],
    };
  });
}
