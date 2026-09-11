import type { BoardSnapshot, TrainProgress } from "../train/progress";

export type MainToWorker =
  | { type: "start"; seed?: number }
  | { type: "stop" };

export type WorkerToMain =
  | { type: "progress"; progress: TrainProgress }
  | { type: "snapshot"; snapshot: BoardSnapshot }
  | { type: "ready" }
  | { type: "stopped" }
  | { type: "error"; message: string };
