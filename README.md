Teach a machine to play Connect Four in your browser — and watch it learn.

# Agent Arena

Phase 0 spike: in-browser **PPO** on Connect Four versus a Random opponent. This is a window into reinforcement learning — a live win-rate trajectory — not a polished trainer and not a better algorithm zoo.

Ownership: **Owner Cage · Lead Forge · CoS Nyborg · Merge Nye**.

## Run

```bash
npm install
npm test
npm run dev
```

Open the Vite URL, click **Start**, and watch games / rolling win rate / entropy move. Training runs in a Web Worker (TensorFlow.js, CPU backend).

To reproduce the Phase 0 convergence claim (same loop as the worker, headless):

```bash
npm run measure
```

See [PHASE0.md](PHASE0.md) for the measured trajectory, what was cut, and surprises.

## Layout

- `src/engine` — Connect Four (6×7), legal moves, win detection, seeded RNG. No TF.js.
- `src/rl` — PPO actor-critic, illegal-action masking, GAE.
- `src/train` — vs-Random loop shared by the worker and `npm run measure`.
- `src/worker` — Web Worker so the UI thread stays free.
- `src/App.tsx` — Start / Stop, live metrics, last-game board.

## Out of scope (parked)

Roster, Customizer, Tutor, self-play, Match mode, milestones, IndexedDB export, polish, a11y pass, GIF, GitHub Pages deploy, Satellite Lab, Protostar / lab-thrust, lab-hitting, multi-game, accounts, cloud / server, algorithm menus, poker.

## License

MIT. See [LICENSE](LICENSE).
