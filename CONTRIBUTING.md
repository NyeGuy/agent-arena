# Contributing

Phase 0 is a spike. Keep PRs small, browser-only, and inside the park list in [AGENTS.md](AGENTS.md).

1. Read the thesis: this is a window into RL, not a better trainer.
2. Put game rules in `src/engine` with tests. Keep TF.js out of the engine.
3. Put learning in `src/rl` / `src/train`. The worker should stay a thin adapter.
4. Do not add Roster, Customizer, Tutor, deploy, GIF, accounts, or extra games.
5. Nye merges. Do not merge your own Phase 0 work.

```bash
npm install
npm test
npm run dev
```
