Teach a machine to play Connect Four in your browser — and watch it learn.

# Agent Arena

Phase 1 Arena slice: in-browser **PPO** on Connect Four versus a **Random** opponent. A window into reinforcement learning — live board, column-probability heat strip, rolling win-rate chart — not a polished trainer and not a better algorithm zoo.

Ownership: **Owner Cage · Lead Forge · CoS Nyborg · Merge Nye**.

## Run

```bash
npm install
npm test
npm run dev
```

Open the Vite URL, click **Train**, leave speed on **Watch**. Training runs in a Web Worker (TensorFlow.js, CPU backend). The heat under each column is the agent’s real policy (masked softmax), not a decoration.

To reproduce the Phase 0 convergence claim (same loop as the worker, headless / Max-like):

```bash
npm run measure
```

See [PHASE1.md](PHASE1.md) for what the slice does, what was cut, and where the spec met reality. See [PHASE0.md](PHASE0.md) for the measured trajectory.

## Layout

- `src/engine` — Connect Four (6×7), legal moves, win detection, seeded RNG. No TF.js.
- `src/rl` — PPO actor-critic, illegal-action masking, GAE, masked softmax.
- `src/train` — vs-Random loop shared by the worker and `npm run measure`.
- `src/worker` — Web Worker so the UI thread stays free.
- `src/ui` — board, heat strip, win-rate chart, controls.
- `src/App.tsx` — Arena slice shell.

## Out of scope (parked)

Roster, Customizer, Tutor, self-play, Match mode, milestones, IndexedDB export/import, thought-feed narrations, teaching-moment panels, algorithm menus, multi-game, accounts, cloud / server, GIF, GitHub Pages, Satellite Lab, Protostar / lab-thrust, lab-hitting, poker.

## License

MIT. See [LICENSE](LICENSE).
