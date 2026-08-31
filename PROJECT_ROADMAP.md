# Endgame Trainer — Roadmap

## Next session (Session Handoff)

**State: every milestone (1–8) built and merged to `main`, and the Supabase project is live** (PR #7). Working tree clean, 47/47 vitest, `npm run validate` clean (13 lessons / 44 test positions / 117 ids), CI green on `main`.

Supabase project `endgame-trainer`, ref `fpbpkgjzomaltdilrxiw`, org `nico101rsa's Org`, free tier, region **ap-northeast-1 (Tokyo)** — the "Asia-Pacific" default resolved to Tokyo, not Sydney. Harmless for a few KB of sync per session; only fixable by recreating the project. `supabase/schema.sql` is applied, `games` corrected to the composite `(user_id, id)` key. Auth URLs set: Site URL `https://nico101rsa.github.io/endgame-trainer/`, redirects for that plus `http://localhost:5173/**`. Verified live: anonymous reads return `[]`, an anonymous insert is rejected with `42501 new row violates row-level security policy`.

Keys live in two places, never in git: `.env` locally (gitignored) and GitHub Actions secrets `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, which `deploy.yml` feeds into the Pages build.

### The two things left — both need Nico

1. **Decide whether the repo goes public.** GitHub Pages refuses to enable on a private repo without a paid plan: `settings/pages` currently shows only "Upgrade or make this repository public to enable Pages". So public repo → free Pages → deployed app. The IP position is written up in `NOTICE.md` (MIT code, CC BY-NC content, originality + no-affiliation statement); the short version is that endgame theory is public knowledge, no Silman text or position is reproduced, and the spec's "Original content" rule (§2) already binds every lesson. Once the repo is public: `gh api -X POST repos/nico101rsa/endgame-trainer/pages -f build_type=workflow`, then re-run the Deploy workflow. Delete the stale `gh-pages` branch after.
2. **Finish the magic-link round trip.** A sign-in link was sent to nico.mcdonald@outlook.com from Chrome at 11:08 on 2026-08-31; the auth user row exists and reads "waiting for verification". Click it **in Chrome** — the PKCE code verifier lives in the localStorage of whichever browser requested the link, so clicking it in a different browser fails with "both auth code and code verifier should be non-empty". Then live-verify what only unit tests have covered: solve a position on device A, sign in on device B and watch it appear; delete a journal game on one device and confirm it stays deleted on the other. Free-tier email is rate-limited (~1 link per 30s, small hourly cap) — if a link expires, wait before re-requesting.

### Running it on a Mac

```bash
git clone https://github.com/nico101rsa/endgame-trainer.git
cd endgame-trainer && npm install
npm run dev                       # http://localhost:5173
npm test && npm run validate      # unit tests + content validator
npx playwright-core install chromium && npm run e2e   # browser smoke suite (once)
```
Node ≥ 23 (the validator relies on native TS type-stripping). Vite uses :5173 — on macOS :5000 is taken by AirPlay.

### Ideas parked for later (nothing is blocking them)

- Flesh out the Tier 3–6 scaffolds into full lessons (each currently has one stub lesson with 2 tests; the spec §4 curriculum lists 5 topics per tier).
- `chunkSizeWarningLimit`: the bundle is ~500 kB (one chunk) — code-splitting the journal routes would quieten the build warning.
- Two pre-existing oxlint warnings in `TestRunner`'s `squareStyles` memo (reads `gameRef` during render) and one fast-refresh note in `board/theme.tsx`. Harmless; tidy if touching that code.

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
- Routes: `/`, `/lesson/:slug`, `/test/:id`, `/review`, `/settings`, `/journal`, `/journal/new`, `/journal/:id`, `/journal/:id/edit` (HashRouter for GitHub Pages).
- `src/journal/` — `types.ts` (no-rating rule encoded), `pgn.ts` (import strips Elo/rating tags and `[%eval]`; export embeds player comments as `{}`), `store.ts` (pure transforms + localStorage + drafts + tallies), `useJournal.ts`.
- `src/sync/` — `client.ts` (null when unconfigured), `merge.ts` (pure LWW per row, lesson-read union, tombstones), `engine.ts` (pull→merge→push, debounced, account-scoped, offline retry), `useSyncAccount.ts`. `initSync()` runs from `main.tsx` and no-ops without env keys.

**Gotchas:**
- No engine ever, no ratings in the journal — extends to tests and dev deps.
- Wrong-map applies at the ROOT move only (engine + spec); deeper mistakes get generic feedback. Design positions accordingly.
- Some trees end early with `result` once the technique is demonstrated (recognition drills, e.g. square-rule entries) — the SRS "clean solve" grade must treat a 1-move solve as legitimate.
- Browser-pane testing: hidden-tab timer throttling delays the 450ms scripted reply — taps during `replying` are ignored by design. Not a bug; wait ≥1.5s between synthetic taps.
- macOS: port 5000 taken by AirPlay; Vite 5173 fine. Preview server name: `endgame-trainer`.
- Sync writes are debounced 2.5s and skip events fired by sync's own saves — otherwise a signed-in session syncs itself in a loop. Keep that guard if touching `engine.ts`.
- Magic links use the PKCE flow deliberately: the implicit flow returns tokens in the URL fragment, which HashRouter rewrites before supabase-js can read them.
- `games` is keyed `(user_id, id)` — game ids are deterministic per-date strings and would collide across accounts on a bare id.
- "Reset progress" while signed in clears the server rows first, else the next sync restores everything; journal JSON import reconciles tombstones the same way.

**Awaiting Nico:** the two browser steps at the top — the Pages source click, and the Supabase project + its URL/anon key. Nothing else is blocked.

## Milestones (from spec §9)

1. ~~**Skeleton** — Vite/React/TS, routing, board renders, one hard-coded position playable, engine unit tests.~~ ✅ 2026-08-30
2. ~~**Content pipeline** — JSON/MD loading, validation script, Tier 1 fully authored.~~ ✅ 2026-08-30 (PR #2)
3. ~~**Progress + SRS** — localStorage, Anki SM-2, review queue (principle cards + positions), export/import.~~ ✅ 2026-08-30
4. ~~**Tier 2 authored; Tiers 3–6 scaffolded.**~~ ✅ 2026-08-30
5. ~~**Polish + deploy** — mobile pass, custom red/cream pieces, settings, "Show solution" button, GitHub Pages workflow, PWA manifest, Playwright smoke tests.~~ ✅ 2026-08-30
6. **Sync** — Supabase magic-link auth, local-first merge (spec §11). ◐ code complete + review-hardened 2026-08-30; needs Nico's Supabase project + live verification.
7. ~~**Journal** — game entry/viewer/list/export (addendum).~~ ✅ 2026-08-30
8. ~~**Journal ↔ trainer links.**~~ ✅ 2026-08-30

## History

- **2026-08-30 (night)** — PRs #4 and #5 merged to `main`; adversarial code review of the sync layer found and fixed 6 real defects (games pk collision across accounts, endless self-triggering sync loop, PKCE vs HashRouter magic links, shared-browser account leakage, reset/import resurrection, a re-entrancy race). First Pages deploy failed only at the "create Pages site" step (needs repo-admin, not grantable to a workflow token); a `gh-pages` branch snapshot was pushed as a fallback. `docs/SYNC_SETUP.md` added.

- **2026-08-30 (late-4)** — Milestone 6 code-complete: full sync engine (schema, pure merge with tests, background push/pull, tombstoned deletes, magic-link account UI). Awaiting a real Supabase project to go live.
- **2026-08-30 (late-3)** — Milestones 7+8 built: the OTB game journal (entry via board or sanitized PGN paste, viewer with inline per-move notes, filterable list with descriptive tallies, JSON+PGN export, drafts, smart defaults, recall-over-retyping autocomplete) and the journal↔trainer links (linked lessons on games with endgame-type suggestions; "My games" on lessons). Rating tags stripped on import per the addendum's hard rule; caught and fixed a chess.js placeholder-header bug ("????.??.??" dates).
- **2026-08-30 (late-2)** — Milestone 5 built: GitHub Pages deploy + CI workflows, relative-base build, PWA manifest + icon, poster piece set (red/ink glyphs), three board themes, sound (WebAudio, no assets), settings UI for all of it, SAN keyboard entry, desktop board-left layout, checked-in Playwright smoke suite (14 checks, all green against the production build).
- **2026-08-30 (late)** — Milestone 4 built: Tier 2 fully authored (distant opposition, key squares, king-in-front verdicts, wrong bishop, two minors — 20 tests, all hand-verified against key-square theory, mates machine-checked for legality with chess.js rules). Tiers 3–6 scaffolded (`scaffold: true` stubs: Lucena bridge, three-pawn breakthrough, rook-vs-pawn promotion trap, trade-into-pawn-endings — 8 more verified tests). Home generalized to all tiers with Preview badges. Validator caught 7 authoring errors.
- **2026-08-30 (eve)** — Milestone 3 built: SM-2 SRS (`src/progress/`, 17 new unit tests), localStorage v2 store with export/import/reset, self-grading TestRunner + "Show solution" button, review-mode principle cards with Anki buttons, `/review` queue with session summary, Home Continue card + due count + progress bars, minimal `/settings`. Browser-verified end-to-end with Playwright.
- **2026-08-30 (pm)** — Milestone 2 merged (PR #2): CONTENT_GUIDE.md, build-time content loader, `validate-content` script, Tier 1 fully authored (square rule, king opposition, K+P vs K, rook pawn draws — 16 tests / 8 demos / 13 cards). New Lesson + Test pages, demo player, flip cards, next-position flow. All content hand-verified against endgame theory; validator caught one illegal-move authoring error. Browser-verified through full play-throughs including promotion and black-orientation boards.
- **2026-08-30 (am)** — Project started from Nico's spec (docs/). Four design directions explored on a Claude Design canvas; settled on direction C ("poster school") with red pieces after visibility mockups. Spec upgraded: Anki SM-2 SRS with principle flip-cards; frictionless-UI ideas. Milestone 1 built and merged: engine + tests, playable opposition position, C-theme UI. Engine validator caught an illegal move in the spec's sample wrong-map.
