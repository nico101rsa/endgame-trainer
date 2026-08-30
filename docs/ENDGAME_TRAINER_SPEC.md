# Endgame Trainer — Project Spec

## 1. Purpose

A web app for studying chess endgames, structured by rating tier in the style of Silman's *Complete Endgame Course*: learn only what you need at your level, then test it on a real board. Range: absolute basics (king opposition, square rule) through what a solid 1800 OTB player must know.

Primary user: a single adult club player studying solo. Must work well on phone and desktop.

## 2. Hard constraints

1. **No chess engine. Ever.** No Stockfish, no WASM engine, no server-side engine, no "engine-verified" positions. Do not add one as an optional feature, dev dependency, or test helper. All position solutions are hand-authored solution trees (see §5). The app never evaluates positions; it only checks moves against the authored tree.
2. **Original content.** Curriculum structure and *ideas* are inspired by Silman; do not reproduce his text or copy his exact positions. Write explanations fresh and construct positions from the underlying theory (classical theoretical endgames — Lucena, Philidor, opposition, etc. — are public knowledge and fine).
3. **Static, free hosting.** Must deploy as a static site (GitHub Pages or Vercel). No backend required for v1. Progress stored client-side (localStorage) with export/import to JSON.
4. **Playable on a phone.** Board must be usable at ~380px width with touch drag or tap-tap moves.

## 3. Stack

- **Vite + React + TypeScript**
- **chess.js** — move legality, FEN/SAN handling
- **react-chessboard** — board UI (drag and tap-to-move, orientation flip, arrows/square highlights)
- **Tailwind** for styling
- **Vitest** for unit tests (solution-tree engine, progress logic)
- **Playwright** for a few smoke e2e tests
- Deploy: GitHub Actions → GitHub Pages

Keep dependencies minimal. No state library beyond React context/reducer unless clearly needed.

## 4. Curriculum

Six tiers. Each tier = a set of **lessons**; each lesson = explanation + principle cards + demo positions + test positions. Content lives in `/content/<tier>/<lesson>.json` plus a markdown explanation file.

### Tier 1 — Foundations (unrated–999)
Assumed known, not covered: basic mates (K+Q vs K, K+R vs K, two rooks). The curriculum starts at king and pawn.
- The square rule (can the king catch the pawn?)
- King opposition: direct opposition, why it matters
- King + pawn vs king: the basic winning and drawing cases
- Rook pawn draws

### Tier 2 — Beginner (1000–1199)
- Distant opposition
- Key squares for the pawn
- King in front of the pawn = win (except rook pawn)
- Wrong-colour bishop + rook pawn draw
- K+2 minor pieces vs K: knowing that B+B mates and B+N is hard (no need to execute B+N yet)

### Tier 3 — Intermediate (1200–1399)
- Triangulation
- Outside passed pawn, protected passed pawn
- Lucena position
- Philidor position
- Queen vs pawn on the 7th (which pawns draw)

### Tier 4 — Club (1400–1599)
- Rook activity: rook behind the passed pawn
- Rook + pawn vs rook: cutting off the king by files and ranks
- Minor piece vs pawns: bishop vs passed pawns, knight vs rook pawn
- Opposite-coloured bishops: basic drawing fortresses
- Pawn endings: breakthroughs, counting tempi, "spare tempo"

### Tier 5 — Strong club (1600–1799)
- Rook endings: short side / long side defence, Vancura position
- Rook vs pawns (rook side to move, king far away)
- Bishop vs knight in open vs closed positions
- Queen endings: perpetual check ideas, centralised queen
- Pawn endings: corresponding squares (introductory)

### Tier 6 — 1800 target (1800+)
- Rook + 2 vs rook + 1 on the same side: drawing technique
- Two connected passed pawns vs rook
- Bishop + pawn vs bishop (same colour): key drawing ideas
- Fortress recognition survey
- Practical technique: when to trade into a pawn ending

Target counts for v1: each lesson has 1–3 demo positions and 4–8 test positions. Ship Tiers 1–2 fully first; scaffold the rest.

## 5. Data model

### Position file (JSON)

```json
{
  "id": "t1-opposition-03",
  "tier": 1,
  "lesson": "king-opposition",
  "title": "Take the opposition",
  "fen": "8/8/4k3/8/4K3/4P3/8/8 w - - 0 1",
  "sideToMove": "w",
  "goal": "win",
  "playerSide": "w",
  "intro": "White to play. Use the opposition to escort the pawn.",
  "solution": {
    "moves": {
      "Kd4": {
        "reply": "Kd6",
        "moves": {
          "e4": { "reply": "Ke6", "moves": { "Kc5": { "result": "win" } } }
        }
      },
      "Kf4": { "reply": "Kf6", "moves": { "e4": { "reply": "Ke6", "moves": { "Kg5": { "result": "win" } } } } }
    },
    "wrong": {
      "Kd3": "Retreating gives up the opposition.",
      "Kf3": "Retreating gives up the opposition — Black's king walks forward."
    },
    "hints": [
      "Which square puts your king directly in front of Black's king with one square between?",
      "Kd4 or Kf4 both take the opposition."
    ]
  },
  "explanationAfter": "Whenever the kings face each other with one square between, the side NOT to move has the opposition."
}
```

Rules for the solution tree:
- `moves` keys are SAN. Every key is a correct move. `reply` is the scripted defender move (choose the most testing defence). Leaf nodes have `result: "win" | "draw"`.
- `wrong` maps specific bad moves to feedback. Any move not in `moves` or `wrong` gets generic feedback ("That doesn't hold — try again").
- `goal` is `win` or `draw` (for the defending side's lessons, e.g. Philidor, the player's goal is to draw).
- A solution may end early with `result` once the technique is demonstrated; you do not need to play out to mate.
- Validate at build time (script): every FEN is legal, every SAN in the tree is legal from its node, every path terminates in a `result`.

### Principle cards (JSON)

Each lesson's JSON also carries a `principles` array: the lesson's core ideas as short flip-cards, reviewed through the same SRS as positions.

```json
{
  "id": "t1-opposition-p1",
  "lesson": "king-opposition",
  "prompt": "Kings face each other with one empty square between them. Who has the opposition?",
  "answer": "The side NOT to move. They can hold the face-off; the mover must give way."
}
```

Rules: 2–5 cards per lesson, one idea per card, prompt answerable in a sentence. A lesson's cards enter the review queue when the lesson is first read.

### Progress (localStorage)

```json
{
  "version": 2,
  "items": {
    "t1-opposition-03": { "kind": "position", "attempts": 3, "solved": 2, "lastSeen": "2026-08-30", "nextDue": "2026-09-02", "ease": 2.5, "intervalDays": 3, "lapses": 0 },
    "t1-opposition-p1": { "kind": "principle", "lastSeen": "2026-08-30", "nextDue": "2026-09-06", "ease": 2.6, "intervalDays": 7, "lapses": 0 }
  },
  "lessons": { "king-opposition": { "readAt": "2026-08-30" } }
}
```

Spaced repetition: **Anki-style (SM-2)**. Every review item — test positions and principle cards alike — carries an ease factor (starts 2.5, floor 1.3) and an interval. New items graduate through learning steps of 1 day then 3 days; after that each pass multiplies the interval by the ease. Grades:

- **Again** (failed, or solution shown): interval resets to 1 day, lapse count +1, ease −0.2.
- **Hard**: interval ×1.2, ease −0.15.
- **Good**: interval × ease.
- **Easy**: interval × ease × 1.3, ease +0.15.

Positions grade themselves from the attempt — clean solve = Good, solved with hint = Hard, failed or solution shown = Again (no Easy for positions). Principle cards are self-graded with the four Anki buttons. Cap intervals at 365 days.

## 6. Features (v1)

### Navigation
- Home: tier overview with progress bars; "Due today" count and a **Review** button.
- Tier page: list of lessons with completion state.
- Lesson page: explanation (markdown) → demo positions (step-through with Next/Prev, annotated) → "Start test".

### Test mode
- Board oriented to the player's side.
- Player makes a move; app checks against the solution tree:
  - Correct → play the scripted reply automatically (small delay), continue.
  - Wrong (in `wrong` map) → show the specific feedback, undo, allow retry.
  - Wrong (unknown) → generic feedback, undo, retry.
  - Reached `result` → success screen with `explanationAfter`, then Next position.
- Hint button: reveals hints one at a time; using a hint marks the attempt as "solved with hint" (counts as a pass, graded Hard — see §5 SRS).
- Show solution button (marks as failed).
- Track attempts and time per position.

### Review mode
- Queue of all items with `nextDue <= today` — principle cards and test positions, shuffled, mixed across tiers.
- Positions use the test UI and grade themselves from the attempt.
- Principle cards: prompt → tap to reveal the answer → self-grade with the four Anki buttons (Again / Hard / Good / Easy).

### Settings
- Board theme (2–3 options), piece set, sound on/off.
- Export progress as JSON; import from JSON.
- Reset progress (with confirm).

### Out of scope for v1
- Accounts, sync, multiplayer, engine analysis (never), opening or middlegame content, PGN import.

## 7. UI notes

- Mobile-first. Board fills the width on phones; controls below the board. On desktop, board left, text right.
- Show the player's goal prominently above the board: "White to play and win" / "Black to play and draw".
- Highlight last move. Highlight the correct move in green briefly after a correct move; red flash on wrong.
- Keep explanations short — one screen. Use a diagram (the board itself) rather than long prose.
- Accessible: keyboard move entry (type SAN) as an alternative to dragging.

### Frictionless UI (added 2026-08-30)

- Home shows a **Continue** card above the tier list: one tap resumes the next thing — due reviews if any, else the first unfinished lesson.
- Tap-to-move: tapping a piece highlights its legal target squares (from chess.js); tapping a target plays the move. Works alongside drag.
- After a failed test position, the retry screen links the lesson's principle card ("Re-read the idea") so the concept is one tap away.
- End of a review session: a short summary (items reviewed, again/hard/good split) rather than dumping back to Home.

## 8. Project structure

```
/content
  /tier1
    king-opposition.md
    king-opposition.json      (array of positions)
    ...
/scripts
  validate-content.ts         (FEN + SAN + tree termination checks)
/src
  /components   Board, LessonReader, TestRunner, ProgressBar, ...
  /engine       solutionTree.ts (pure functions, fully unit-tested)
  /progress     store.ts, srs.ts
  /pages        Home, Tier, Lesson, Review, Settings
  /content      loader.ts (imports JSON/MD at build time)
```

## 9. Milestones

1. **Skeleton** — Vite/React/TS, routing, board renders, one hard-coded position playable with the solution-tree checker. Unit tests for `solutionTree.ts`.
2. **Content pipeline** — JSON/MD loading, validation script, Tier 1 fully authored (all lessons, demo + test positions).
3. **Progress + SRS** — localStorage, review queue, export/import.
4. **Tier 2 authored; Tiers 3–6 scaffolded** with lesson stubs and at least 2 positions each.
5. **Polish + deploy** — mobile layout pass, settings, GitHub Pages workflow, web manifest (Add to Home Screen), Playwright smoke tests.
6. **Sync (Supabase)** — see §11.

## 11. Sync — Supabase

Goal: phone and desktop see the same progress and games. Single user, no sharing.

### Service
- Supabase free tier. Auth via **magic link (email OTP)** — no passwords.
- Client: `@supabase/supabase-js`. Anon key and project URL in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`); safe to ship in a static build because Row Level Security restricts every row to its owner.

### Tables

```sql
create table progress (
  user_id uuid references auth.users not null,
  item_id text not null,            -- position id or principle-card id
  kind text not null default 'position',
  attempts int not null default 0,
  solved int not null default 0,
  ease real not null default 2.5,
  interval_days int not null default 0,
  lapses int not null default 0,
  last_seen date,
  next_due date,
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table lesson_reads (
  user_id uuid references auth.users not null,
  lesson_id text not null,
  read_at date not null,
  primary key (user_id, lesson_id)
);

create table games (
  id text primary key,
  user_id uuid references auth.users not null,
  data jsonb not null,           -- full game object from the OTB addendum
  updated_at timestamptz not null default now(),
  deleted boolean not null default false
);

alter table progress enable row level security;
alter table lesson_reads enable row level security;
alter table games enable row level security;
create policy "own rows" on progress for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on lesson_reads for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on games for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

Keep the SQL in `/supabase/schema.sql` and apply it via the Supabase SQL editor.

### Sync rules
- **Local-first.** localStorage/IndexedDB remains the working copy; the app is fully usable offline and when signed out.
- **On sign-in / app load:** pull all rows for the user, merge into local by `updated_at` (newer wins per row). Then push any local rows newer than remote.
- **On change:** write locally immediately, then upsert the changed row(s) to Supabase in the background. Queue failed writes and retry on next load or when back online.
- **Conflict rule:** last-write-wins per row using `updated_at`. Good enough for one user on two devices.
- **Deletes:** soft-delete (`deleted = true`) so a deletion on one device propagates instead of being resurrected by the other.
- **Signed out:** app works exactly as before; signing in later merges local into remote.
- Keep JSON export/import from §6 as a manual backup path.

### UI
- Settings → Account: sign in with email, show signed-in address, sign out, "Sync now" button, last-synced timestamp, and a small indicator when writes are queued offline.

## 10. Working agreements for Claude Code

- Before authoring positions, write a short `CONTENT_GUIDE.md` describing how to construct a position and its solution tree, so later positions are consistent.
- Run `validate-content` in CI; a broken tree fails the build.
- Keep every position solvable by reasoning from the lesson's stated idea — no trick positions that need calculation beyond the tier.
- Explain *why* in `wrong` feedback whenever possible; that's where the learning happens.
- If you are unsure a hand-authored line is correct, flag it in a `needsReview: true` field rather than guessing. Do not resolve doubt with an engine.
