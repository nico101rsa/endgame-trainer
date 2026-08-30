# Endgame Trainer — Roadmap

## Next session (Session Handoff)

**State:** Milestones 1 + 2 merged to `main` (PR #2), tests green (12/12 vitest), `npm run validate` clean, build clean. Tier 1 is fully authored and playable end-to-end: Home → lesson list → Lesson page (markdown explanation, tap-to-reveal principle cards, step-through demos, test list) → Test positions with tap-tap/drag moves, hints, named wrong-move feedback, scripted replies, next-position flow. Content: 4 lessons, 16 test positions, 8 demos, 13 principle cards — every tree line hand-reasoned (no engine, ever).

**The next step — Milestone 3, progress + SRS:**
1. `src/progress/srs.ts` — pure SM-2 functions per spec §5 (ease 2.5 start / 1.3 floor, learning steps 1d→3d, Again/Hard/Good/Easy multipliers, 365d cap). Unit-test it first — it's pure logic like the solution-tree engine.
2. `src/progress/store.ts` — localStorage v2 shape from spec §5 (`items`, `lessons`), export/import JSON, reset with confirm.
3. Wire grading: positions self-grade from the attempt (clean = Good, hinted = Hard, failed/solution shown = Again — note there's no "Show solution" button yet, spec §6 requires one). Principle cards get the four Anki buttons.
4. Review queue page: due items (`nextDue <= today`), cards + positions shuffled; end-of-session summary (spec §7 frictionless list).
5. Home: due-count + Review button + Continue card; tier/lesson progress bars.

**Key seams:**
- `src/content/loader.ts` — `lessons`, `getLesson(slug)`, `getPosition(id)`; content loaded at build time via `import.meta.glob` from `/content/tier1/*.{json,md}`. Types in `src/content/types.ts` (`Lesson`, `Demo`, `PrincipleCard`).
- `CONTENT_GUIDE.md` — read before touching any content; documents the margin-one-tempo design rule, early-`result` leaves, root-only wrong-map, and the no-engine verification protocol.
- `npm run validate` (`scripts/validate-content.ts`, plain Node ≥23 type-stripping) — legality, termination, demo replay, counts, id uniqueness. Run it after any content edit; it catches real authoring errors (caught an illegal king move during M2).
- `src/components/TestRunner.tsx` — takes `nextTo`/`lessonTo` route props; remounted per position via `key`. react-chessboard v5 API (single `options` prop). Grading hooks belong here (hintsUsed already tracked).
- `src/components/DemoPlayer.tsx`, `PrincipleCard.tsx` (flip card, awaiting SRS buttons), `Markdown.tsx` (minimal: `##`, `**bold**`, `-` lists only — single `*em*` NOT supported).
- Routes: `/`, `/lesson/:slug`, `/test/:id` (HashRouter for GitHub Pages).

**Gotchas:**
- No engine ever, no ratings in the journal — extends to tests and dev deps.
- Wrong-map applies at the ROOT move only (engine + spec); deeper mistakes get generic feedback. Design positions accordingly.
- Some trees end early with `result` once the technique is demonstrated (recognition drills, e.g. square-rule entries) — the SRS "clean solve" grade must treat a 1-move solve as legitimate.
- Browser-pane testing: hidden-tab timer throttling delays the 450ms scripted reply — taps during `replying` are ignored by design. Not a bug; wait ≥1.5s between synthetic taps.
- macOS: port 5000 taken by AirPlay; Vite 5173 fine. Preview server name: `endgame-trainer`.
- Custom red/cream pieces still queued for the polish milestone (M5).

**Awaiting Nico:** nothing — Milestone 3 can start straight away.

## Milestones (from spec §9)

1. ~~**Skeleton** — Vite/React/TS, routing, board renders, one hard-coded position playable, engine unit tests.~~ ✅ 2026-08-30
2. ~~**Content pipeline** — JSON/MD loading, validation script, Tier 1 fully authored.~~ ✅ 2026-08-30 (PR #2)
3. **Progress + SRS** — localStorage, Anki SM-2, review queue (principle cards + positions), export/import.
4. **Tier 2 authored; Tiers 3–6 scaffolded.**
5. **Polish + deploy** — mobile pass, custom red/cream pieces, settings, "Show solution" button, GitHub Pages workflow, PWA manifest, Playwright smoke tests.
6. **Sync** — Supabase magic-link auth, local-first merge (spec §11).
7. **Journal** — game entry/viewer/list/export (addendum).
8. **Journal ↔ trainer links.**

## History

- **2026-08-30 (pm)** — Milestone 2 merged (PR #2): CONTENT_GUIDE.md, build-time content loader, `validate-content` script, Tier 1 fully authored (square rule, king opposition, K+P vs K, rook pawn draws — 16 tests / 8 demos / 13 cards). New Lesson + Test pages, demo player, flip cards, next-position flow. All content hand-verified against endgame theory; validator caught one illegal-move authoring error. Browser-verified through full play-throughs including promotion and black-orientation boards.
- **2026-08-30 (am)** — Project started from Nico's spec (docs/). Four design directions explored on a Claude Design canvas; settled on direction C ("poster school") with red pieces after visibility mockups. Spec upgraded: Anki SM-2 SRS with principle flip-cards; frictionless-UI ideas. Milestone 1 built and merged: engine + tests, playable opposition position, C-theme UI. Engine validator caught an illegal move in the spec's sample wrong-map.
