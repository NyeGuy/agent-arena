# Phase 1 — Arena vertical slice

Ownership: **Owner Cage · Lead Forge · CoS Nyborg · Merge Nye**.

Thesis check: this slice is a *window*. The live board, the column heat strip, and the rolling win-rate chart are the curriculum. Nothing here is a stronger trainer. The heat strip is the masked softmax the agent actually samples from — the same numbers `act()` uses — not a decoration, not Q-values, not a smoothed cartoon.

## What works

- Connect Four 6×7, same Phase 0 engine / PPO / vs-Random loop, still in a Web Worker.
- **Watch** (default): every ply is visible at a throttled pace. On the learner's turn the heat strip paints first, then the piece drops. A ghost disc marks the *sampled* column — not always the tallest bar.
- **Faster** / **Max**: same learning, less waiting. Max is Phase 0 headless throughput; the board refreshes between games, the heat strip shows the last real policy.
- Pause / resume (weights stay put) and reset (new agent, empty record).
- Rolling win-rate chart as the primary learning record, with a chance line at 50%.
- One opponent: **Random**. No Tutor, no self-play, no Match.
- Keyboard: space train/pause/resume, `1` / `2` / `3` for Watch / Faster / Max.
- Cold load stays a static page. TensorFlow.js is imported inside the worker only when Train is hit.

## What was cut

Everything still parked: Roster, Customizer, Tutor, self-play, Match, milestones, IndexedDB export/import, thought-feed narrations, teaching-moment panels, algorithm menus, multi-game, accounts, cloud, server, GIF, GitHub Pages, full a11y pass.

No reward shaping. No second opponent. No per-game PPO update (see surprises).

## Surprises — where reality argued with the spec

- **The heat strip does not evolve every game.** PPO updates every 32 games. For a stretch of Watch you will stare at the *same* smear, then it jumps. That is not a bug and we did not “fix” it by updating every game (that would rewrite the RL core and lie about when learning happens). The status line says when the agent is studying the last 32 games. The interface is the curriculum: policy is stepwise.
- **Watch is not “a few minutes to above chance.”** Phase 0’s wall-clock claim is Max speed. Watch spends ~180ms per ply, twice that on the learner so you can read the heat before the drop. A human who stays on Watch will wait a long time to see the chart climb. That is the point of a window, and why the speed control exists. We did not silently train extra headless games behind Watch — that would train invisibly.
- **Max still has a real last-policy strip**, but it is a *sample* of decisions (end of each game), not a continuous movie. The caption and the speed labels say so. Flooding the page thread with every ply at Max would violate “UI 60fps”; the UI coalesces worker messages to one paint per frame and keeps every win-rate point.
- **Entropy is secondary, not hidden.** The thesis is plain language first: “guess spread — high = smear, low = spike.” The number is still the PPO entropy. Eval (“best-column check”) stays every 200 games; it is a measurement, not training, and the status line names it when it runs so it is not an invisible hitch.
- **Seating is still random each game.** The seat badge is required for the board to be readable. That is chrome in service of the window, not a roster.
- **Reset raced the worker.** First browser pass: Reset cleared the board but a leftover progress frame (and the rAF flush) redrew the old win-rate line. The record is the curriculum — a ghost of the last run is a lie. Each run now has an id; stale frames are dropped.

## Scope additions we are willing to defend

| Addition | Why it is not park-list creep |
| --- | --- |
| `softmaxProbs` on the actor | Heat strip cannot be honest without the actual masked softmax. One function, tested against `logProbMasked`. |
| Per-ply live frames + pause pacing | Spec: visible games, pause/resume, watchable default. The loop grew hooks; the update math did not. |
| “Studying the last 32 games” phase | Makes the batch update visible. Without it, Watch looks frozen and people will assume a bug. |
| Ghost disc on the sampled column | Shows that PPO *samples*. Otherwise the heat strip reads as “it always plays the spike.” |
| Speed `1`/`2`/`3` and space | Cheap keyboard, named in the footer. Not an a11y pass. |

## How to run

```bash
npm install
npm test
npm run dev
```

Open the Vite URL. Hit **Train**. Stay on **Watch**. You should see a near-uniform smear become, over updates, a spike — and the win-rate line leave the 50% chance mark.

Headless twin of the same loop (Max-like, no UI):

```bash
npm run measure
```

## Non-goals restated

This PR is allowed to look like a slice. It is not allowed to grow a roster, a tutor, or a silent trainer behind the window.
