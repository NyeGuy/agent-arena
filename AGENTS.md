# Agents

## Ownership

| Role | Name | Notes |
| --- | --- | --- |
| Owner | Cage | Product / thesis stewardship |
| Lead | Forge | Implementation lead |
| Chief of Staff | Nyborg | Scope, park list, process |
| Merge | Nye | Only merge authority |

Nye confirmed this Phase 0 PR. Do not merge from the agent side.

## Thesis (do not violate)

**Legibility / human learning rate / make the invisible visible.**

Agent Arena is a *window into RL*, not a better trainer. If a change makes training stronger but harder to see, it is the wrong change. Phase 0 exists only to prove that in-browser training works and that a human can watch a win-rate leave chance.

## Phase 0 (this repo, this PR)

- Connect Four 6×7 vs Random
- PPO in TensorFlow.js (DQN only if PPO is unstable — flag the tradeoff in PHASE0.md)
- Web Worker training loop
- Bare spike UI: Start / Stop, live win rate, optional board
- Browser-only; no backend

## Park / out of scope

Do not start these. Do not "just add a stub screen."

**Arena product (later phases)**

- Roster
- Customizer
- Tutor
- Self-play
- Match mode
- Milestones
- IndexedDB export
- Polish / a11y pass
- GIF
- GitHub Pages deploy (Phase 3; do not block Phase 0)

**Lab / universe (never this repo unless Cage reopens)**

- Satellite Lab
- Protostar / lab-thrust
- Lab-hitting

**Platform / games**

- Multi-game
- Accounts
- Cloud / server training
- Algorithm menus
- Poker

## Craft bar

Starts here, stays light: MIT license, this file, PIPELINE.md, a clean README, CONTRIBUTING.md stub, tests on the engine. No design system, no deploy pipeline, no GIF hunt.
