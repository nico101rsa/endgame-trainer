# Endgame Trainer — Roadmap

## Next session (Session Handoff)

**State:** Milestones 1–4 done. M1–M3 merged to `main` (PRs #1–#3); M4 on branch `claude/endgame-trainer-continue-n1ooa0`. 29/29 vitest, `npm run validate` clean (13 lessons, 44 test positions, 117 ids), build clean, Playwright-verified (all 6 tiers on Home with Preview badges, tier-2 solves + wrong-move feedback, scaffold lesson pages, breakthrough sequence). Tier 2 fully authored (5 lessons / 20 tests / 9 demos / 21 cards); Tiers 3–6 each scaffolded with one `scaffold: true` stub lesson (Lucena, breakthrough, rook vs pawn, trade-down) carrying 2 hand-verified tests + demos. Home groups all tiers with progress bars.

**The next step — Milestone 6, Supabase sync (spec §11). BLOCKED on Nico:** needs either a Supabase personal access token (`sbp_...`, Account → Access Tokens — lets the assistant create the project and pull keys itself) or a created project's URL + anon key. Everything else has shipped.

**M7+M8 shipped (same session):** the OTB journal per the addendum — `src/journal/` (types with the no-rating rule encoded, PGN in/out with Elo/engine-tag stripping, localStorage store, draft autosave, suggestion pools, descriptive tallies; 9 unit tests), pages `/journal` (list, filters, W-D-L tallies, JSON/PGN export + JSON import), `/journal/new` + edit (board play-in or PGN paste, smart defaults, autocomplete datalists, post-mortem form, tags, linked lessons with endgame-type word-match suggestions), `/journal/:id` viewer (step-through with per-move notes added inline). Lesson pages show "My games" for linked games. Browser-verified: PGN paste with rating tags stripped, move notes, tallies, smart defaults, draft restore, suggestions ordering.

**M5 shipped (same session):**
- Deploy: `.github/workflows/deploy.yml` (Pages, auto-enablement) + `ci.yml` (lint/validate/test/build/e2e); `vite base: './'` so one build works at any path; web manifest + SVG icon (Add to Home Screen).
- Poster piece set (`src/board/theme.tsx`): red vs ink filled glyphs with cream halo, SVG-text so they scale free; board themes parchment/slate/tournament; both selectable in Settings alongside a sound toggle (`src/settings/`, WebAudio blips in `src/sound.ts`, no assets).
- TestRunner: SAN keyboard entry (spec §7 accessibility), desktop two-column layout (board left, controls right at `md:`), move/wrong/solved sounds.
- Checked-in e2e: `npm run e2e` (e2e/smoke.mjs, playwright-core against `vite preview`; 14 checks). CI installs Chromium; locally `npx playwright-core install chromium` once or set `PW_CHROMIUM`.

**M4 design decisions:**
- Tier-2 test positions are anchored to *provable* theory only: the key-square table (pawn ranks 2–4 → two ranks ahead; 5th/6th → directly ahead), the key-square theorem (reach one = win regardless of move), Tier-1-verified fortress/escort patterns, mate/stalemate positions machine-checked with chess.js (rules only — legality/mate/stalemate detection is not an engine).
- Every wrong-map claim was hand-proven or mechanically confirmed; the validator caught 6 illegal wrong-map entries and 1 illegal demo step during authoring (mostly moves blocked by the player's own pieces — it earns its keep).
- Two-minors tests are all two-bishop corner mates because knights always have non-losing quiet moves — a rejection-tight knight test can't exist under the "never reject a correct move" rule. B+N/N+N verdicts live in cards + the knights demo.
- Scaffold lessons carry `scaffold: true` (validator allows 2–8 tests instead of 4–8; Home shows a red Preview badge).
- Trees may include multiple correct root moves (e.g. rook-pawn corner runs) but only positions with provably-failing alternatives became tests; several designs were discarded when alternates also won/drew.

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

**Awaiting Nico:** Supabase credentials for Milestone 6 (a personal access token `sbp_...`, or a project URL + anon key). Everything else can proceed.

## Milestones (from spec §9)

1. ~~**Skeleton** — Vite/React/TS, routing, board renders, one hard-coded position playable, engine unit tests.~~ ✅ 2026-08-30
2. ~~**Content pipeline** — JSON/MD loading, validation script, Tier 1 fully authored.~~ ✅ 2026-08-30 (PR #2)
3. ~~**Progress + SRS** — localStorage, Anki SM-2, review queue (principle cards + positions), export/import.~~ ✅ 2026-08-30
4. ~~**Tier 2 authored; Tiers 3–6 scaffolded.**~~ ✅ 2026-08-30
5. ~~**Polish + deploy** — mobile pass, custom red/cream pieces, settings, "Show solution" button, GitHub Pages workflow, PWA manifest, Playwright smoke tests.~~ ✅ 2026-08-30
6. **Sync** — Supabase magic-link auth, local-first merge (spec §11).
7. ~~**Journal** — game entry/viewer/list/export (addendum).~~ ✅ 2026-08-30
8. ~~**Journal ↔ trainer links.**~~ ✅ 2026-08-30

## History

- **2026-08-30 (late-3)** — Milestones 7+8 built: the OTB game journal (entry via board or sanitized PGN paste, viewer with inline per-move notes, filterable list with descriptive tallies, JSON+PGN export, drafts, smart defaults, recall-over-retyping autocomplete) and the journal↔trainer links (linked lessons on games with endgame-type suggestions; "My games" on lessons). Rating tags stripped on import per the addendum's hard rule; caught and fixed a chess.js placeholder-header bug ("????.??.??" dates).
- **2026-08-30 (late-2)** — Milestone 5 built: GitHub Pages deploy + CI workflows, relative-base build, PWA manifest + icon, poster piece set (red/ink glyphs), three board themes, sound (WebAudio, no assets), settings UI for all of it, SAN keyboard entry, desktop board-left layout, checked-in Playwright smoke suite (14 checks, all green against the production build).
- **2026-08-30 (late)** — Milestone 4 built: Tier 2 fully authored (distant opposition, key squares, king-in-front verdicts, wrong bishop, two minors — 20 tests, all hand-verified against key-square theory, mates machine-checked for legality with chess.js rules). Tiers 3–6 scaffolded (`scaffold: true` stubs: Lucena bridge, three-pawn breakthrough, rook-vs-pawn promotion trap, trade-into-pawn-endings — 8 more verified tests). Home generalized to all tiers with Preview badges. Validator caught 7 authoring errors.
- **2026-08-30 (eve)** — Milestone 3 built: SM-2 SRS (`src/progress/`, 17 new unit tests), localStorage v2 store with export/import/reset, self-grading TestRunner + "Show solution" button, review-mode principle cards with Anki buttons, `/review` queue with session summary, Home Continue card + due count + progress bars, minimal `/settings`. Browser-verified end-to-end with Playwright.
- **2026-08-30 (pm)** — Milestone 2 merged (PR #2): CONTENT_GUIDE.md, build-time content loader, `validate-content` script, Tier 1 fully authored (square rule, king opposition, K+P vs K, rook pawn draws — 16 tests / 8 demos / 13 cards). New Lesson + Test pages, demo player, flip cards, next-position flow. All content hand-verified against endgame theory; validator caught one illegal-move authoring error. Browser-verified through full play-throughs including promotion and black-orientation boards.
- **2026-08-30 (am)** — Project started from Nico's spec (docs/). Four design directions explored on a Claude Design canvas; settled on direction C ("poster school") with red pieces after visibility mockups. Spec upgraded: Anki SM-2 SRS with principle flip-cards; frictionless-UI ideas. Milestone 1 built and merged: engine + tests, playable opposition position, C-theme UI. Engine validator caught an illegal move in the spec's sample wrong-map.
