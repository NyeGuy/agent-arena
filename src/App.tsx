import { useEffect } from "react";
import { Board } from "./ui/Board";
import { Controls } from "./ui/Controls";
import { HeatStrip } from "./ui/HeatStrip";
import { useTraining } from "./ui/useTraining";
import { WinRateChart } from "./ui/WinRateChart";
import "./App.css";

export function App() {
  const train = useTraining();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) {
        return;
      }
      if (event.code === "Space") {
        event.preventDefault();
        if (train.status === "running") {
          train.pause();
        } else if (train.status === "paused") {
          train.resume();
        } else if (train.status === "idle" && train.ready) {
          train.start();
        }
      } else if (event.key === "Enter" && train.status === "idle" && train.ready) {
        event.preventDefault();
        train.start();
      } else if (event.key === "1") {
        train.setSpeed("watch");
      } else if (event.key === "2") {
        train.setSpeed("fast");
      } else if (event.key === "3") {
        train.setSpeed("max");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [train]);

  const windowSize = train.progress?.rollingWindow ?? 100;
  const heatCaption = heatCaptionFor(train.frame?.policy ?? null, train.frame?.pending ?? false);

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">Phase 1 · Arena slice</p>
        <h1>Agent Arena</h1>
        <p className="lede">
          Watch a machine learn Connect Four. The heat under each column is the
          agent&apos;s real guess — not a decoration.
        </p>
      </header>

      <Controls
        ready={train.ready}
        status={train.status}
        speed={train.speed}
        onTrain={train.start}
        onPause={train.pause}
        onResume={train.resume}
        onReset={train.reset}
        onSpeed={train.setSpeed}
      />

      <p className="status-line" aria-live="polite">
        {statusLine(train)}
      </p>
      {train.error ? <p className="error">{train.error}</p> : null}

      <section className="panel stage" aria-label="Live game">
        <div className="stage-head">
          <Seat frame={train.frame} />
          <p className="opponent">Opponent: Random — any open column, equally likely.</p>
        </div>
        <Board frame={train.frame} />
        <HeatStrip frame={train.frame} />
        <p className="caption">{heatCaption}</p>
      </section>

      <section className="panel record" aria-label="Learning record">
        <h2>Win rate vs Random</h2>
        <p className="sub">
          Share of the last {windowSize} games the learner won. Chance is about 50%.
          This is the exploring train policy, not a hidden eval.
        </p>
        <WinRateChart history={train.history} window={windowSize} />
        <div className="metrics">
          <Metric label="Games" value={fmtInt(train.progress?.games)} />
          <Metric
            label={`Last ${windowSize} games`}
            value={fmtPct(train.progress?.rollingWinRate)}
            good={(train.progress?.rollingWinRate ?? 0) >= 0.6}
          />
          <Metric label="Wins / losses / draws" value={recordLine(train.progress)} />
          <Metric
            label="Guess spread"
            value={fmtNum(train.progress?.entropy)}
            hint="High = smear. Low = spike."
          />
          <Metric
            label="Best-column check"
            value={fmtPct(train.progress?.evalWinRate)}
            hint="Greedy play vs Random, every 200 games."
          />
          <Metric label="Elapsed" value={fmtTime(train.progress?.elapsedMs)} />
        </div>
      </section>

      <p className="note">
        Keyboard: space pause/resume, 1–3 speed. Arena slice only — one opponent
        (Random). See PHASE1.md.
      </p>
    </main>
  );
}

function Seat({ frame }: { frame: ReturnType<typeof useTraining>["frame"] }) {
  if (!frame) {
    return <p className="seat">Learner seats as red or yellow at random each game.</p>;
  }
  const color = frame.agentPlayer === 1 ? "red" : "yellow";
  const cls = frame.agentPlayer === 1 ? "swatch p1" : "swatch p2";
  return (
    <p className="seat">
      <span className={cls} aria-hidden="true" />
      Learner is <strong>{color}</strong> this game
      {frame.outcome !== "ongoing" ? ` · ${endLine(frame)}` : ""}
    </p>
  );
}

function endLine(frame: NonNullable<ReturnType<typeof useTraining>["frame"]>): string {
  if (frame.outcome === "draw") {
    return "draw";
  }
  return frame.winner === frame.agentPlayer ? "learner won" : "Random won";
}

function heatCaptionFor(policy: number[] | null, pending: boolean): string {
  if (!policy) {
    return "Column heat appears on the learner's turn. Early training should look like a smear. Later, a spike.";
  }
  if (pending) {
    return "These are the real probabilities. The outlined column is the sampled drop — not always the tallest bar.";
  }
  return "Taller = more likely. The guess stays put for 32 games, then jumps when the agent studies what happened.";
}

function statusLine(train: ReturnType<typeof useTraining>): string {
  if (!train.ready) {
    return "Loading the training worker…";
  }
  if (train.status === "idle") {
    return `Ready · PPO vs Random · seed ${train.seed} · space to train`;
  }
  if (train.status === "paused") {
    const n = train.frame?.gameIndex ?? train.progress?.games ?? "—";
    return `Paused on game ${n} · space to resume`;
  }
  if (train.status === "running" && !train.progress) {
    return "Waking TensorFlow.js…";
  }
  if (train.phase === "updating") {
    return "Studying the last 32 games — this is when the guess changes.";
  }
  if (train.phase === "evaluating") {
    return `Checking greedy play vs Random (${train.progress?.evalGames ?? 40} games).`;
  }
  if (train.frame) {
    const color = train.frame.agentPlayer === 1 ? "red" : "yellow";
    return `Game ${train.frame.gameIndex} · learner is ${color} · vs Random`;
  }
  return `Training · ${train.progress?.games ?? 0} games`;
}

function Metric({
  label,
  value,
  good = false,
  hint,
}: {
  label: string;
  value: string;
  good?: boolean;
  hint?: string;
}) {
  return (
    <div className="metric">
      <span className="label">{label}</span>
      <span className={`value${good ? " good" : ""}`}>{value}</span>
      {hint ? <span className="hint">{hint}</span> : null}
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

function recordLine(progress: ReturnType<typeof useTraining>["progress"]): string {
  if (!progress) {
    return "—";
  }
  return `${progress.wins} / ${progress.losses} / ${progress.draws}`;
}
