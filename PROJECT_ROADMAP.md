# Endgame Trainer — Roadmap

## Next session (Session Handoff)

**State:** Milestones 1–3 done. M1+M2 merged to `main` (PRs #1, #2); M3 (progress + SRS) on branch `claude/endgame-trainer-continue-n1ooa0`. Tests green (29/29 vitest), `npm run validate` clean, build clean, browser-verified (Playwright: lesson-read seeds cards → review queue → summary; clean solve grades Good; Show solution grades Again). The full loop now works: read lesson (principle cards enter the queue due today) → tests self-grade into SM-2 → Home shows Continue card / due count / per-lesson progress bars → `/review` runs the shuffled due queue (cards with 4 Anki buttons, positions via TestRunner) and ends on an again/hard/good/easy summary → `/settings` has export/import/reset.

**The next step — Milestone 4, Tier 2 authored + Tiers 3–6 scaffolded:**
1. Author Tier 2 per spec §4 (5 lessons: distant opposition, key squares, king-in-front wins, wrong-colour bishop + rook pawn, two-minors awareness) — same JSON+MD pair format under `/content/tier2/`. Read `CONTENT_GUIDE.md` first; hand-verify every line, `npm run validate` after each file.
2. Scaffold Tiers 3–6: lesson stubs + ≥2 positions each (spec §9). The loader already globs `/content/*/`, so new tiers appear once files exist.
3. Home currently renders Tier 1 only (`lessonsForTier(1)`) — generalize to group all tiers with their progress bars (Continue logic already walks all lessons in loader order).

**M3 design decisions (differ from Anki, match spec):**
- Day-granularity scheduling: an Again-graded item comes due *tomorrow* (interval 1d), not later the same session. The review queue is a snapshot taken at mount.
- Grading is once per position visit (`gradedRef`): wrong move or Show solution ⇒ Again, hints ⇒ Hard, clean ⇒ Good; Restart doesn't wipe the slate; "Play it again" never re-grades.
- Learning steps: interval <3d counts as learning — Hard repeats the step, Easy graduates straight to 4d (spec's multiplier formulas apply from 3d up).
- Lesson "read" = first visit to the Lesson page; seeds that lesson's cards due today (once, ever).

**Key seams:**
- `src/progress/srs.ts` (pure SM-2 + ISO date helpers), `store.ts` (pure transforms over the v2 shape + localStorage binding, `PROGRESS_EVENT` for same-tab refresh), `useProgress.ts` (React hook). All pure parts unit-tested in Node.
- `TestRunner` props: `onGraded`/`onNext` switch it into review mode; it records its own grade exactly once. `PrincipleCard` shows Anki buttons only when given `onGrade`.
- `src/content/loader.ts` — `lessons`, `getLesson(slug)`, `getPosition(id)`; content loaded at build time via `import.meta.glob` from `/content/tier1/*.{json,md}`. Types in `src/content/types.ts` (`Lesson`, `Demo`, `PrincipleCard`).
- `CONTENT_GUIDE.md` — read before touching any content; documents the margin-one-tempo design rule, early-`result` leaves, root-only wrong-map, and the no-engine verification protocol.
- `npm run validate` (`scripts/validate-content.ts`, plain Node ≥23 type-stripping) — legality, termination, demo replay, counts, id uniqueness. Run it after any content edit; it catches real authoring errors (caught an illegal king move during M2).
- `src/components/TestRunner.tsx` — remounted per position via `key`; react-chessboard v5 API (single `options` prop). Grades itself once per visit and records via the store.
- `src/components/DemoPlayer.tsx`, `PrincipleCard.tsx`, `Markdown.tsx` (minimal: `##`, `**bold**`, `-` lists only — single `*em*` NOT supported).
- Routes: `/`, `/lesson/:slug`, `/test/:id`, `/review`, `/settings` (HashRouter for GitHub Pages).

**Gotchas:**
- No engine ever, no ratings in the journal — extends to tests and dev deps.
- Wrong-map applies at the ROOT move only (engine + spec); deeper mistakes get generic feedback. Design positions accordingly.
- Some trees end early with `result` once the technique is demonstrated (recognition drills, e.g. square-rule entries) — the SRS "clean solve" grade must treat a 1-move solve as legitimate.
- Browser-pane testing: hidden-tab timer throttling delays the 450ms scripted reply — taps during `replying` are ignored by design. Not a bug; wait ≥1.5s between synthetic taps.
- macOS: port 5000 taken by AirPlay; Vite 5173 fine. Preview server name: `endgame-trainer`.
- Custom red/cream pieces still queued for the polish milestone (M5). Settings page exists (M3) but only holds progress data controls; themes/pieces/sound slot in there.
- oxlint emits two pre-existing `react(refs)` warnings in `TestRunner`'s `squareStyles` memo (reads `gameRef` during render). Harmless with the current remount-per-position design; tidy during M5 if touching that code.

**Awaiting Nico:** nothing — Milestone 4 can start straight away.

## Milestones (from spec §9)

1. ~~**Skeleton** — Vite/React/TS, routing, board renders, one hard-coded position playable, engine unit tests.~~ ✅ 2026-08-30
2. ~~**Content pipeline** — JSON/MD loading, validation script, Tier 1 fully authored.~~ ✅ 2026-08-30 (PR #2)
3. ~~**Progress + SRS** — localStorage, Anki SM-2, review queue (principle cards + positions), export/import.~~ ✅ 2026-08-30
4. **Tier 2 authored; Tiers 3–6 scaffolded.**
5. **Polish + deploy** — mobile pass, custom red/cream pieces, settings, "Show solution" button, GitHub Pages workflow, PWA manifest, Playwright smoke tests.
6. **Sync** — Supabase magic-link auth, local-first merge (spec §11).
7. **Journal** — game entry/viewer/list/export (addendum).
8. **Journal ↔ trainer links.**

## History

- **2026-08-30 (eve)** — Milestone 3 built: SM-2 SRS (`src/progress/`, 17 new unit tests), localStorage v2 store with export/import/reset, self-grading TestRunner + "Show solution" button, review-mode principle cards with Anki buttons, `/review` queue with session summary, Home Continue card + due count + progress bars, minimal `/settings`. Browser-verified end-to-end with Playwright.
- **2026-08-30 (pm)** — Milestone 2 merged (PR #2): CONTENT_GUIDE.md, build-time content loader, `validate-content` script, Tier 1 fully authored (square rule, king opposition, K+P vs K, rook pawn draws — 16 tests / 8 demos / 13 cards). New Lesson + Test pages, demo player, flip cards, next-position flow. All content hand-verified against endgame theory; validator caught one illegal-move authoring error. Browser-verified through full play-throughs including promotion and black-orientation boards.
- **2026-08-30 (am)** — Project started from Nico's spec (docs/). Four design directions explored on a Claude Design canvas; settled on direction C ("poster school") with red pieces after visibility mockups. Spec upgraded: Anki SM-2 SRS with principle flip-cards; frictionless-UI ideas. Milestone 1 built and merged: engine + tests, playable opposition position, C-theme UI. Engine validator caught an illegal move in the spec's sample wrong-map.
