import type { TrainSpeed } from "../worker/protocol";
import type { RunStatus } from "./useTraining";

const SPEEDS: { id: TrainSpeed; label: string; hint: string }[] = [
  { id: "watch", label: "Watch", hint: "Every drop, watchable speed" },
  { id: "fast", label: "Faster", hint: "Still visible, quicker" },
  { id: "max", label: "Max", hint: "As fast as the machine; board updates between games" },
];

export function Controls({
  ready,
  status,
  speed,
  onTrain,
  onPause,
  onResume,
  onReset,
  onSpeed,
}: {
  ready: boolean;
  status: RunStatus;
  speed: TrainSpeed;
  onTrain: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSpeed: (speed: TrainSpeed) => void;
}) {
  const idle = status === "idle" || status === "loading";
  const running = status === "running";
  const paused = status === "paused";

  return (
    <section className="panel controls" aria-label="Training controls">
      {idle ? (
        <button className="primary" type="button" onClick={onTrain} disabled={!ready}>
          Train
        </button>
      ) : null}
      {running ? (
        <button className="primary" type="button" onClick={onPause}>
          Pause
        </button>
      ) : null}
      {paused ? (
        <button className="primary" type="button" onClick={onResume}>
          Resume
        </button>
      ) : null}
      <button type="button" onClick={onReset} disabled={idle && !ready}>
        Reset
      </button>

      <div className="speed" role="radiogroup" aria-label="Training speed">
        {SPEEDS.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={speed === s.id}
            aria-label={`${s.label}. ${s.hint}`}
            className={speed === s.id ? "speed-btn on" : "speed-btn"}
            onClick={() => onSpeed(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </section>
  );
}
