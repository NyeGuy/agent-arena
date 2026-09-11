import type { TrainSpeed } from "./protocol";
import { DEFAULT_SPEED, SPEED_DELAY_MS, type MainToWorker, type WorkerToMain } from "./protocol";

let running = false;
let paused = false;
let generation = 0;
let currentRunId = 0;
let speed: TrainSpeed = DEFAULT_SPEED;

function post(message: WorkerToMain): void {
  self.postMessage(message);
}

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function start(seed: number, nextSpeed: TrainSpeed, runId: number): Promise<void> {
  const myGen = ++generation;
  currentRunId = runId;
  running = true;
  paused = false;
  speed = nextSpeed;

  try {
    const { runTraining } = await import("../train/loop");
    if (generation !== myGen) {
      return;
    }
    await runTraining(
      { seed },
      {
        shouldContinue: () => running && generation === myGen,
        isPaused: () => paused,
        moveDelayMs: () => SPEED_DELAY_MS[speed],
        emitLive: () => speed !== "max",
        onProgress: (progress) => {
          if (running && generation === myGen) {
            post({ type: "progress", runId, progress });
          }
        },
        onLiveFrame: (frame) => {
          if (running && generation === myGen) {
            post({ type: "frame", runId, frame });
          }
        },
        onPhase: (phase) => {
          if (running && generation === myGen) {
            post({ type: "phase", runId, phase });
          }
        },
        yieldFn: yieldToEventLoop,
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    post({ type: "error", runId, message });
  } finally {
    if (generation === myGen) {
      running = false;
      paused = false;
      post({ type: "stopped", runId });
    }
  }
}

self.onmessage = (event: MessageEvent<MainToWorker>) => {
  const data = event.data;
  if (data.type === "start") {
    running = false;
    paused = false;
    void start(data.seed ?? 42, data.speed ?? DEFAULT_SPEED, data.runId);
  } else if (data.type === "pause") {
    if (running) {
      paused = true;
      post({ type: "paused", runId: currentRunId });
    }
  } else if (data.type === "resume") {
    paused = false;
  } else if (data.type === "reset") {
    running = false;
    paused = false;
    generation += 1;
  } else if (data.type === "setSpeed") {
    speed = data.speed;
  }
};

post({ type: "ready" });
