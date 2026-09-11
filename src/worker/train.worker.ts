import { runTraining } from "../train/loop";
import type { MainToWorker, WorkerToMain } from "./protocol";

let running = false;
let generation = 0;

function post(message: WorkerToMain): void {
  self.postMessage(message);
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function start(seed: number): Promise<void> {
  const myGen = ++generation;
  running = true;
  try {
    await runTraining(
      { seed },
      {
        shouldContinue: () => running && generation === myGen,
        onProgress: (progress) => {
          if (running && generation === myGen) {
            post({ type: "progress", progress });
          }
        },
        onSnapshot: (snapshot) => {
          if (running && generation === myGen) {
            post({ type: "snapshot", snapshot });
          }
        },
        yieldFn: yieldToEventLoop,
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    post({ type: "error", message });
  } finally {
    if (generation === myGen) {
      running = false;
      post({ type: "stopped" });
    }
  }
}

self.onmessage = (event: MessageEvent<MainToWorker>) => {
  const data = event.data;
  if (data.type === "start") {
    running = false;
    void start(data.seed ?? 42);
  } else if (data.type === "stop") {
    running = false;
  }
};

post({ type: "ready" });
