import { useCallback, useEffect, useRef, useState } from "react";
import { appendPoint, type LiveFrame, type TrainPhase, type TrainProgress, type WinRatePoint } from "../train/progress";
import { DEFAULT_SPEED, type TrainSpeed, type WorkerToMain } from "../worker/protocol";

export type RunStatus = "loading" | "idle" | "running" | "paused";

const DEFAULT_SEED = 42;

export function useTraining() {
  const workerRef = useRef<Worker | null>(null);
  const pendingProgress = useRef<TrainProgress | null>(null);
  const pendingFrame = useRef<LiveFrame | null>(null);
  const pendingPhase = useRef<TrainPhase | null>(null);
  const pendingHistory = useRef<WinRatePoint[]>([]);
  const rafRef = useRef(0);

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<RunStatus>("loading");
  const [phase, setPhase] = useState<TrainPhase>("playing");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<TrainProgress | null>(null);
  const [frame, setFrame] = useState<LiveFrame | null>(null);
  const [history, setHistory] = useState<WinRatePoint[]>([]);
  const [speed, setSpeedState] = useState<TrainSpeed>(DEFAULT_SPEED);
  const statusRef = useRef<RunStatus>("loading");
  statusRef.current = status;

  const flush = useCallback(() => {
    rafRef.current = 0;
    if (pendingProgress.current) {
      const next = pendingProgress.current;
      pendingProgress.current = null;
      setProgress(next);
    }
    if (pendingHistory.current.length > 0) {
      const add = pendingHistory.current;
      pendingHistory.current = [];
      setHistory((h) => {
        let next = h;
        for (const point of add) {
          next = appendPoint(next, point);
        }
        return next;
      });
    }
    if (pendingFrame.current) {
      setFrame(pendingFrame.current);
      pendingFrame.current = null;
    }
    if (pendingPhase.current) {
      setPhase(pendingPhase.current);
      pendingPhase.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    if (rafRef.current) {
      return;
    }
    rafRef.current = requestAnimationFrame(flush);
  }, [flush]);

  useEffect(() => {
    const worker = new Worker(new URL("../worker/train.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerToMain>) => {
      const msg = event.data;
      if (msg.type === "ready") {
        setReady(true);
        setStatus((s) => (s === "loading" ? "idle" : s));
      } else if (msg.type === "progress") {
        pendingProgress.current = msg.progress;
        if (msg.progress.rollingWinRate !== null && msg.progress.games > 0) {
          pendingHistory.current = appendPoint(pendingHistory.current, {
            games: msg.progress.games,
            rate: msg.progress.rollingWinRate,
          });
        }
        schedule();
      } else if (msg.type === "frame") {
        pendingFrame.current = msg.frame;
        schedule();
      } else if (msg.type === "phase") {
        pendingPhase.current = msg.phase;
        schedule();
      } else if (msg.type === "paused") {
        setStatus("paused");
      } else if (msg.type === "stopped") {
        setStatus("idle");
      } else if (msg.type === "error") {
        setError(msg.message);
        setStatus("idle");
      }
    };
    worker.onerror = (event) => {
      setError(event.message || "Worker failed");
      setStatus("idle");
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [schedule]);

  const clearBoard = useCallback(() => {
    pendingProgress.current = null;
    pendingFrame.current = null;
    pendingPhase.current = null;
    pendingHistory.current = [];
    setProgress(null);
    setFrame(null);
    setHistory([]);
    setPhase("playing");
    setError(null);
  }, []);

  const start = useCallback(() => {
    clearBoard();
    setStatus("running");
    workerRef.current?.postMessage({ type: "start", seed: DEFAULT_SEED, speed });
  }, [clearBoard, speed]);

  const pause = useCallback(() => {
    if (statusRef.current !== "running") {
      return;
    }
    setStatus("paused");
    workerRef.current?.postMessage({ type: "pause" });
  }, []);

  const resume = useCallback(() => {
    if (statusRef.current !== "paused") {
      return;
    }
    setStatus("running");
    workerRef.current?.postMessage({ type: "resume" });
  }, []);

  const reset = useCallback(() => {
    workerRef.current?.postMessage({ type: "reset" });
    clearBoard();
    setStatus(ready ? "idle" : "loading");
  }, [clearBoard, ready]);

  const setSpeed = useCallback((next: TrainSpeed) => {
    setSpeedState(next);
    workerRef.current?.postMessage({ type: "setSpeed", speed: next });
  }, []);

  return {
    ready,
    status,
    phase,
    error,
    progress,
    frame,
    history,
    speed,
    seed: DEFAULT_SEED,
    start,
    pause,
    resume,
    reset,
    setSpeed,
  };
}
