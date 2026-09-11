# Agents

## Ownership

| Role | Name | Notes |
| --- | --- | --- |
| Owner | Cage | Product / thesis stewardship |
| Lead | Forge | Implementation lead |
| Chief of Staff | Nyborg | Scope, park list, process |
| Merge | Nye | Only merge authority |

Nye merges. Do not merge from the agent side.

## Thesis (do not violate)

**Legibility / human learning rate / make the invisible visible.**

Agent Arena is a *window into RL*, not a better trainer. If a change makes training stronger but harder to see, it is the wrong change. The interface is the curriculum. Nothing trains invisibly. Plain language first, jargon second.

## Phase 1 (this repo, this PR)

- Connect Four 6×7 vs Random
- PPO in TensorFlow.js (do not swap algorithms silently)
- Web Worker training loop
- Arena slice: live board, column heat strip (real policy), win-rate chart, pause / resume / reset, speed control
- Browser-only; no backend

Phase 0 (in-browser training proof) is done. See PHASE0.md.

## Park / out of scope

Do not start these. Do not "just add a stub screen."

**Arena product (later phases)**

- Roster
- Customizer
- Tutor
- Self-play
- Match mode
- Milestones
- IndexedDB export / import
- Thought-feed narrations
- Teaching-moment panels
- Algorithm menus
- Full a11y / GIF / GitHub Pages (Phase 3; do not block Phase 1)

**Lab / universe (never this repo unless Cage reopens)**

- Satellite Lab
- Protostar / lab-thrust
- Lab-hitting

**Platform / games**

- Multi-game
- Accounts
- Cloud / server training
- Poker

## Craft bar

Starts here, stays light: MIT license, this file, PIPELINE.md, a clean README, CONTRIBUTING.md stub, tests on the engine and on the heat-strip math. No design system, no deploy pipeline, no GIF hunt.
