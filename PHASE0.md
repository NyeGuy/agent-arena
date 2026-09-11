# Phase 0 — in-browser PPO proof

Ownership: **Owner Cage · Lead Forge · CoS Nyborg · Merge Nye**.

Thesis check: this spike makes *learning* visible (games, rolling win rate, entropy, last board). It does not add Arena chrome.

## Algorithm

**PPO** (clipped surrogate, GAE-λ, illegal-action mask). TensorFlow.js, CPU backend, actor-critic MLP `84 → 128 tanh → 128 tanh → {7 logits, 1 value}`.

DQN was **not** used. If a later revision falls back, say so here and name the tradeoff: DQN is often stabler on discrete boards and easier to tune, but it hides the policy (ε-greedy / Q values) and is a worse window into on-policy learning.

## What works

- Connect Four 6×7: gravity, legal columns, horizontal / vertical / both-diagonal wins, draw, deterministic seeding. Tests in `src/engine/connect4.test.ts`.
- Observation is two binary planes (own / opponent) so the same network plays either color.
- PPO samples only legal columns; illegal logits are masked to −1e9 before softmax.
- Training vs Random in a Web Worker; the page thread only renders metrics + the last finished board.
- Headless twin of that loop: `npm run measure`.

## What was cut

Everything in the AGENTS.md park list: Roster, Customizer, Tutor, self-play, Match, milestones, IndexedDB, polish, a11y, GIF, GitHub Pages, Satellite Lab, Protostar / lab-thrust, lab-hitting, multi-game, accounts, cloud, algorithm menus, poker.

No reward shaping beyond terminal `+1 / −1 / 0`. No self-play. No GPU / WebGL path (workers here use CPU).

## Surprises

Recorded during the measure run and browser pass. Update this section if a rerun changes the story.

- TensorFlow.js inside a module worker is usable if the backend is forced to **cpu**. WebGL is not assumed.
- Per-step `predict()` overhead dominates wall time more than the Connect Four rules. The net is tiny; framework dispatch is not.
- Seating the learner as P1 or P2 at 50/50 keeps "chance" near 50%. Always-P1 would start above 50% because Connect Four has a first-player bias even under random play (see baseline in the table notes).
- Advantage normalization mattered more than clip ε for a first stable climb. Without it, early batches with a single +1/−1 terminal were noisy.

## Measured win-rate trajectory

**Pending the official `npm run measure` run on this revision.** The table below is filled after that command finishes. Reproduction steps are already the source of truth.

| games | rolling win rate (100) | greedy eval (40 games) | entropy | elapsed |
| ---: | ---: | ---: | ---: | ---: |
| 0 | — | — | — | — |

Claim to satisfy: near-chance at the start, clearly above random within a few minutes.

## How to reproduce the claim

Same code path as the browser worker (`src/train/loop.ts`).

```bash
npm install
npm test
npm run measure
```

Fixed knobs (also the worker defaults):

| knob | value |
| --- | --- |
| seed | 42 |
| opponent | legal-move uniform random |
| seating | learner is P1 or P2 with equal probability |
| γ, λ | 0.99, 0.95 |
| clip ε | 0.2 |
| entropy coef | 0.02 |
| Adam lr | 3e-4 |
| games / update | 32 |
| PPO epochs | 4 |
| hidden | 128×128 tanh |

Browser path: `npm run dev` → Start. Expect the same *shape* (chance → above random). Wall-clock will differ by machine; the measure script is the cited number.

## Non-goals restated

This PR is allowed to look unfinished. It is not allowed to be an Arena.
