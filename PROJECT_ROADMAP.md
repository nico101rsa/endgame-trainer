# Endgame Trainer — Roadmap

## Next session (Session Handoff)

**State:** Milestone 1 merged to `main`, tests green (12/12 vitest). The app runs (`npm run dev`, port 5173, or preview server `endgame-trainer` in `.claude/launch.json` at Playground level): Home → one playable test position (king opposition) with tap-tap + drag moves, hints, wrong-move feedback, scripted replies, solved screen. Design is settled and complete on the Claude Design canvas ("Endgame Trainer" artifact): direction C "poster school" — cream `#f0e6d2`, ink `#1a170f`, red `#c53024`, Anton + Schibsted Grotesk, 3px borders, hard offset shadows, red pieces for Black.

**The next step — Milestone 2, content pipeline:**
1. Write `CONTENT_GUIDE.md` (spec §10 requires it before authoring positions).
2. Move content to `/content/tier1/<lesson>.json` + `.md` files loaded at build time (`src/content/loader.ts`), replacing the hardcoded `src/content/positions.ts`.
3. `scripts/validate-content.ts` reusing `validateSolution` from the engine (it already checks FEN legality, SAN legality, tree termination — and it caught a bug in the spec's own sample, see gotchas).
4. Author Tier 1 fully: square rule, king opposition, K+P vs K, rook pawn draws — each with principle cards (2–5 per lesson), 1–3 demos, 4–8 test positions.

**Key seams:**
- `src/engine/solutionTree.ts` — pure engine: `startAttempt`/`applyMove` cursor walk + `validateSolution`. Fully unit-tested (`solutionTree.test.ts`). The root `wrong` map only applies to the first move (spec-faithful).
- `src/components/TestRunner.tsx` — board UI: react-chessboard **v5 API** (single `options` prop; `onPieceDrop` returns boolean to accept/reject; `onSquareClick` for tap-tap).
- Theme tokens live in `src/index.css` `@theme` block (Tailwind v4, no config file); fonts loaded in `index.html`.
- Design working files in `design/*.dc.html` + `canvas.json`; re-seed with the design skill helper and republish to the same artifact URL. `design/endgame-trainer-directions.html` is the seeded output (gitignored, regenerable).
- Spec decisions baked in: Anki SM-2 SRS over principle cards + positions (spec §5), frictionless-UI list (spec §7), journal autocomplete/smart defaults (addendum §4).

**Gotchas:**
- No engine ever, no ratings in the journal — hard constraints, they extend to tests and dev dependencies.
- The spec's original sample had `"e4"` in the wrong-map, but e4 is illegal there (own king blocks the pawn). Fixed in spec + content; `validateSolution` catches this class of error — trust it over sample data.
- macOS: port 5000 is taken by AirPlay; Vite's 5173 is fine.
- Custom red/cream board pieces (to match the design) are not yet in the app — react-chessboard `pieces` option accepts custom renderers; queued for the polish milestone.

**Awaiting Nico:** nothing — Milestone 2 can start straight away.

## Milestones (from spec §9)

1. ~~**Skeleton** — Vite/React/TS, routing, board renders, one hard-coded position playable, engine unit tests.~~ ✅ 2026-08-30
2. **Content pipeline** — JSON/MD loading, validation script, Tier 1 fully authored.
3. **Progress + SRS** — localStorage, Anki SM-2, review queue (principle cards + positions), export/import.
4. **Tier 2 authored; Tiers 3–6 scaffolded.**
5. **Polish + deploy** — mobile pass, custom red/cream pieces, settings, GitHub Pages workflow, PWA manifest, Playwright smoke tests.
6. **Sync** — Supabase magic-link auth, local-first merge (spec §11).
7. **Journal** — game entry/viewer/list/export (addendum).
8. **Journal ↔ trainer links.**

## History

- **2026-08-30** — Project started from Nico's spec (docs/). Four design directions explored on a Claude Design canvas; settled on direction C ("poster school") with red pieces after visibility mockups. Spec upgraded: Anki SM-2 SRS with principle flip-cards; frictionless-UI ideas (Continue card, legal-move dots, autocomplete from past entries, smart defaults, draft autosave). Milestone 1 built and merged: engine + tests, playable opposition position, C-theme UI. Engine validator caught an illegal move in the spec's sample wrong-map.
