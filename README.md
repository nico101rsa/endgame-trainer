# Endgame Trainer

A web app for studying chess endgames, structured by rating tier in the style of Silman's *Complete Endgame Course*, plus a personal OTB game journal. Built with Vite, React, TypeScript, chess.js and react-chessboard.

Two hard rules from the spec: **no chess engine, ever** (all solutions are hand-authored trees), and **no ratings in the journal**.

- Full spec: [docs/ENDGAME_TRAINER_SPEC.md](docs/ENDGAME_TRAINER_SPEC.md)
- Journal addendum: [docs/SPEC_ADDENDUM_OTB_DATABASE.md](docs/SPEC_ADDENDUM_OTB_DATABASE.md)
- Design mockups: `design/` (Claude Design canvas working files)
- Roadmap and session handoff: [PROJECT_ROADMAP.md](PROJECT_ROADMAP.md)

## Commands

```bash
npm run dev       # dev server on :5173
npm test          # vitest (solution-tree engine + SRS)
npm run validate  # content validator (FEN/SAN legality, tree termination)
npm run build     # typecheck + production build
npm run e2e       # Playwright smoke tests against the built app
```

For `npm run e2e` locally, install a browser once with
`npx playwright-core install chromium` (or point `PW_CHROMIUM` at an
existing Chromium binary).

## Deployment

Pushes to `main` deploy to GitHub Pages via `.github/workflows/deploy.yml`
(build is relative-path based, HashRouter handles routing). The app ships a
web manifest, so it can be added to a phone home screen.
