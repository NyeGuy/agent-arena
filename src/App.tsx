import { useEffect, useRef, useState } from "react";
import { COLS, ROWS } from "./engine/connect4";
import type { BoardSnapshot, TrainProgress } from "./train/progress";
import type { WorkerToMain } from "./worker/protocol";
import "./App.css";

const DEFAULT_SEED = 42;

export function App() {
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<TrainProgress | null>(null);
  const [snapshot, setSnapshot] = useState<BoardSnapshot | null>(null);

  useEffect(() => {
    const worker = new Worker(new URL("./worker/train.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerToMain>) => {
      const msg = event.data;
      if (msg.type === "ready") {
        setReady(true);
      } else if (msg.type === "progress") {
        setProgress(msg.progress);
      } else if (msg.type === "snapshot") {
        setSnapshot(msg.snapshot);
      } else if (msg.type === "stopped") {
        setRunning(false);
      } else if (msg.type === "error") {
        setError(msg.message);
        setRunning(false);
      }
    };
    worker.onerror = (event) => {
      setError(event.message || "Worker failed");
      setRunning(false);
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  const start = () => {
    setError(null);
    setProgress(null);
    setSnapshot(null);
    setRunning(true);
    workerRef.current?.postMessage({ type: "start", seed: DEFAULT_SEED });
  };

  const stop = () => {
    workerRef.current?.postMessage({ type: "stop" });
  };

  return (
    <main className="page">
      <p className="eyebrow">Phase 0 spike · window into RL</p>
      <h1>Agent Arena</h1>
      <p className="lede">
        In-browser PPO on Connect Four, trained against a Random opponent. Training
        runs in a Web Worker so the page stays responsive.
      </p>

      <section className="panel controls">
        <button className="primary" type="button" onClick={start} disabled={!ready || running}>
          Start
        </button>
        <button type="button" onClick={stop} disabled={!running}>
          Stop
        </button>
        <span className="status">
          {!ready ? "Loading TensorFlow.js worker…" : running ? "Training" : "Idle"}
          {" · seed "}
          {DEFAULT_SEED}
          {" · PPO vs Random"}
        </span>
      </section>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel metrics" aria-live="polite">
        <Metric label="Games" value={fmtInt(progress?.games)} />
        <Metric
          label={`Win rate / ${progress?.rollingWindow ?? 100}`}
          value={fmtPct(progress?.rollingWinRate)}
          good={(progress?.rollingWinRate ?? 0) >= 0.6}
        />
        <Metric label="Wins / losses / draws" value={recordLine(progress)} />
        <Metric label="Entropy" value={fmtNum(progress?.entropy)} />
        <Metric label="Eval win rate" value={fmtPct(progress?.evalWinRate)} />
        <Metric label="Elapsed" value={fmtTime(progress?.elapsedMs)} />
      </section>

      <section className="panel board-wrap">
        <Board snapshot={snapshot} />
        <p className="caption">
          Last finished game. Red is player 1, yellow is player 2. The agent is
          randomly seated as either color each game. Rolling win rate is the
          exploring train policy; eval is greedy vs Random.
        </p>
      </section>

      <p className="note">
        Spike only — no roster, customizer, tutor, or deploy. See PHASE0.md for the
        measured win-rate trajectory and how to reproduce it.
      </p>
    </main>
  );
}

function Metric({
  label,
  value,
  good = false,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <div className="metric">
      <span className="label">{label}</span>
      <span className={`value${good ? " good" : ""}`}>{value}</span>
    </div>
  );
}

function Board({ snapshot }: { snapshot: BoardSnapshot | null }) {
  const cells = snapshot?.cells ?? Array<number>(ROWS * COLS).fill(0);
  const last = snapshot?.lastMove;
  return (
    <div className="board" role="img" aria-label="Connect Four board">
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        const v = cells[i];
        const isLast = last !== null && last !== undefined && last.row === row && last.col === col;
        const cls = ["cell", v === 1 ? "p1" : "", v === 2 ? "p2" : "", isLast ? "last" : ""]
          .filter(Boolean)
          .join(" ");
        return <div key={i} className={cls} />;
      })}
    </div>
  );
}

function fmtInt(n: number | undefined): string {
  return n === undefined ? "—" : String(n);
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) {
    return "—";
  }
  return `${(n * 100).toFixed(1)}%`;
}

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) {
    return "—";
  }
  return n.toFixed(3);
}

function fmtTime(ms: number | undefined): string {
  if (ms === undefined) {
    return "—";
  }
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
}

function recordLine(progress: TrainProgress | null): string {
  if (!progress) {
    return "—";
  }
  return `${progress.wins} / ${progress.losses} / ${progress.draws}`;
}
