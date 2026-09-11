import type { LiveFrame, TrainPhase, TrainProgress } from "../train/progress";

export type TrainSpeed = "watch" | "fast" | "max";

/** Per-ply pause. Watch is the pedagogical default; max is Phase 0 headless throughput. */
export const SPEED_DELAY_MS: Record<TrainSpeed, number> = {
  watch: 220,
  fast: 50,
  max: 0,
};

export const DEFAULT_SPEED: TrainSpeed = "watch";

export type MainToWorker =
  | { type: "start"; seed?: number; speed?: TrainSpeed; runId: number }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "reset" }
  | { type: "setSpeed"; speed: TrainSpeed };

export type WorkerToMain =
  | { type: "progress"; runId: number; progress: TrainProgress }
  | { type: "frame"; runId: number; frame: LiveFrame }
  | { type: "phase"; runId: number; phase: TrainPhase }
  | { type: "ready" }
  | { type: "paused"; runId: number }
  | { type: "stopped"; runId: number }
  | { type: "error"; runId?: number; message: string };
