# Pipeline

Ownership: **Owner Cage · Lead Forge · CoS Nyborg · Merge Nye**.

Thesis: legibility / human learning rate / make the invisible visible. A window into RL, not a better trainer.

## Phase 0 — in-browser training proof (done)

PPO (TensorFlow.js) trains in the browser on Connect Four versus Random. Win rate leaves chance. Documented in [PHASE0.md](PHASE0.md).

## Phase 1 — Arena vertical slice (this PR)

The “watching it learn” moment, end to end: visible training games, live column-probability heat strip (real policy), rolling win-rate chart, one opponent (Random), pause / resume / reset, watchable speed plus Max.

Success for Phase 1:

1. A human can open the page, hit Train, and *see* policy confidence form on the heat strip while win-rate climbs vs Random.
2. Training stays in the Web Worker; the page stays responsive.
3. [PHASE1.md](PHASE1.md) records what works, what was cut, and where reality disagreed with the spec.
4. RL core stays separable under `src/engine` + `src/rl`. No park-list screens.

## Parked phases (do not pull forward)

| Later | Intent | Explicitly not now |
| --- | --- | --- |
| Phase 2+ Arena | Roster, Customizer, Tutor, Match, self-play | One opponent (Random) only |
| Persistence | IndexedDB export / reload | No save format |
| Phase 3 share | GIF + GitHub Pages, fuller a11y | Do not block Phase 1 |
| Never-here unless reopened | Satellite Lab, Protostar / lab-thrust, lab-hitting | Out of this repo |
| Platform | Accounts, cloud, multi-game, algorithm menus, poker | Browser-only C4 |

## Merge gate

Nye merges. Agents open PRs and stop.
