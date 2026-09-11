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

- TensorFlow.js CPU in Node ran **800 games in 10.6s** on this agent VM. The “few minutes on a mid-range laptop” budget is for the *browser* worker; the algorithm is not the bottleneck, `predict()` dispatch is.
- **On-policy rolling win rate is noisy.** It started at 40% (n=50), touched 55% at 200, *dipped to 44% at 400*, then 65–67% at 600–800. Greedy eval is the cleaner “does it beat Random?” signal: **72.5% by 200 games**, 77.5% / 92.5% / 82.5% at 400 / 600 / 800. We left the dip in the table — hiding it would violate the thesis.
- Random vs Random in this 400-game sample had **0 draws** and a **54.5% P1** win rate. Seating the learner as either color is what makes chance ≈ 50% (measured 50.5%).
- Forcing the TF.js backend to **cpu** is what makes the module worker viable. Importing `@tensorflow/tfjs` still logs a WebGL probe failure in browsers without WebGL; training continues on CPU. `ensureTfCpu()` now selects CPU *before* `tf.ready()`.
- Browser pass on this VM (Chromium, `npm run dev`): Start → 160 games / 47% rolling at ~2s → **4224 games / 90% rolling + 90% greedy eval at 41s**, then Stop returned to Idle. Entropy fell 1.82 → 0.99. The board showed finished games throughout. Same shape as the headless table, just more games because we let it run.

## Measured win-rate trajectory

Host: this cloud-agent VM, Node 22, `@tensorflow/tfjs` 4.22 CPU (same loop as the browser worker). Command: `npm run measure` on revision after the engine tests + PPO spike. Seed **42**.

**Baseline (no learning, 400 games)**

| setup | win rate |
| --- | ---: |
| Random vs Random, P1 wins | 54.5% |
| Draws (Random vs Random) | 0.0% |
| Random seated as P1 or P2 (training seating) | 50.5% |

**PPO vs Random**

| games | rolling win rate (100) | greedy eval (40 games) | entropy | elapsed |
| ---: | ---: | ---: | ---: | ---: |
| 0 | — | — | — | 0.0s |
| 50 | 40.0% | — | 1.877 | 0.6s |
| 100 | 48.0% | — | 1.866 | 1.6s |
| 200 | 55.0% | 72.5% | 1.844 | 3.0s |
| 400 | 44.0% | 77.5% | 1.841 | 5.8s |
| 600 | 65.0% | 92.5% | 1.730 | 8.2s |
| 800 | 67.0% | 82.5% | 1.777 | 10.6s |

Claim: seated chance is ~50%; greedy play is clearly above Random by 200 games (~3s here, well inside “a few minutes”). Rolling (exploratory) training games follow more slowly and wobble — that is the visible learning curve, not a dashboard cosmetic.

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
