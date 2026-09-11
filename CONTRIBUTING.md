# Contributing

Phase 1 is an Arena slice. Keep PRs small, browser-only, and inside the park list in [AGENTS.md](AGENTS.md).

1. Read the thesis: this is a window into RL, not a better trainer. Nothing trains invisibly.
2. Put game rules in `src/engine` with tests. Keep TF.js out of the engine.
3. Put learning in `src/rl` / `src/train`. The worker should stay a thin adapter.
4. The column heat strip must be the real masked policy, not a visual stand-in.
5. Do not add Roster, Customizer, Tutor, self-play, Match, deploy, GIF, accounts, or extra games.
6. Nye merges. Do not merge your own Phase 1 work.

```bash
npm install
npm test
npm run dev
```
