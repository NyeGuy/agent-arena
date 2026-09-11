# Pipeline

Ownership: **Owner Cage · Lead Forge · CoS Nyborg · Merge Nye**.

Thesis: legibility / human learning rate / make the invisible visible. A window into RL, not a better trainer.

## Phase 0 — in-browser training proof (this PR)

Technical proof that PPO (TensorFlow.js) can train in the browser on Connect Four versus Random and that the win rate moves from near-chance to clearly above random in minutes on a mid-range laptop.

Success for Phase 0:

1. Runnable spike (`npm run dev`) with Start / Stop and a live win rate.
2. Engine tests (`npm test`).
3. [PHASE0.md](PHASE0.md) documents a measured trajectory and how to reproduce it (`npm run measure`).
4. RL core stays separable under `src/engine` + `src/rl`.

## Parked phases (do not pull forward)

| Later | Intent | Explicitly not now |
| --- | --- | --- |
| Phase 1+ Arena | Roster, Customizer, Tutor, Match, self-play | No UI beyond the spike |
| Persistence | IndexedDB export / reload | No save format |
| Phase 3 share | GIF + GitHub Pages | Do not block Phase 0 |
| Never-here unless reopened | Satellite Lab, Protostar / lab-thrust, lab-hitting | Out of this repo |
| Platform | Accounts, cloud, multi-game, algorithm menus, poker | Browser-only C4 |

## Merge gate

Nye merges. Agents open PRs and stop.
