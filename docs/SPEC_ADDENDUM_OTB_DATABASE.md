# Spec Addendum — OTB Game Database

Extends `ENDGAME_TRAINER_SPEC.md`. Same stack, same repo, new section of the app.

## 1. Purpose

A personal record of over-the-board games: the moves, the context, and the player's own post-mortem. It is a journal, not an analysis tool.

## 2. Hard constraints

1. **No engine, no computer analysis.** The §2 rule from the main spec applies in full here. The app never evaluates a position, never marks a move as a blunder/inaccuracy, never suggests a better move, never calls any AI API to comment on a game. There are no evaluation bars, no accuracy scores, no "best move" hints. Do not add any of this, even as a hidden or optional feature. All assessment of a game is written by the player.
2. **No rating fields anywhere.** No player rating, no opponent rating, no rating change, no performance rating, no rating history. Do not import ratings from PGN headers (strip `WhiteElo`, `BlackElo`, and similar tags on import). Do not compute anything that stands in for a rating.
3. **Static, local-first.** Games stored in localStorage/IndexedDB, with export/import as a single JSON file and PGN export. No accounts.

## 3. Data model

```json
{
  "id": "g-2026-08-29-01",
  "date": "2026-08-29",
  "event": "Club championship, round 4",
  "venue": "Norths Chess Club",
  "timeControl": "90+30",
  "colour": "w",
  "opponent": "J. Smith",
  "result": "0-1",
  "opening": "Queen's Gambit Declined",
  "pgn": "1. d4 d5 2. c4 e6 ...",
  "notes": {
    "summary": "Player's own one-paragraph account of the game.",
    "turningPoint": "Move number and what happened, in the player's words.",
    "whatDecidedIt": "opening | middlegame | endgame | time | mistake | opponent-quality | other",
    "lessons": "What I take from this game.",
    "moveComments": { "23": "Missed that ...Rc2 was coming." }
  },
  "phaseReached": "endgame",
  "endgameType": "rook-and-pawns",
  "linkedLessons": ["t3-philidor"],
  "tags": ["time-trouble", "endgame-loss"]
}
```

- `result` is from the player's perspective in the UI ("Win / Loss / Draw") but stored as standard PGN result.
- `whatDecidedIt` and `endgameType` are controlled vocabularies (editable list in settings).
- `linkedLessons` references lesson IDs from the trainer, so a game can point at the material to study.

## 4. Features

### Game entry
- Enter moves by playing them on the board (chess.js validates legality) **or** paste PGN. On paste, strip rating and engine-related tags; keep Date, Event, Site, Round, White, Black, Result, TimeControl, ECO, Opening.
- Metadata form: date, event, venue, time control, colour, opponent name, result, opening (free text with autocomplete from previous entries).
- Notes form with the fields above. `moveComments` are added while stepping through the game.
- **Recall over retyping (added 2026-08-30):** every free-text metadata field — event, venue, opponent, opening, time control — autocompletes from previous entries, most recent first. Enter "Norths Chess Club" once and it is a one-tap suggestion next time. Derive the suggestion lists from saved games; no separate lookup tables.
- **Smart defaults:** a new game pre-fills date = today, and venue/event/time control from the most recent game; colour defaults to the opposite of the last game's.
- **Draft autosave:** a half-entered game survives navigating away or closing the app; returning to "New game" offers the draft back.

### Game viewer
- Step through moves with the board, player's comments shown at the relevant move.
- No annotation symbols, no evaluation. The player may add their own `?`/`!` in comments as plain text if they wish; the app does not generate them.

### Game list
- Sortable and filterable by date, result, colour, opening, event, `whatDecidedIt`, `phaseReached`, `endgameType`, tags.
- Simple counts only (games played, W/L/D by colour, by opening, by `whatDecidedIt`). Counts are descriptive tallies of the player's own entries — not performance metrics. Never display a trend line that could act as a proxy for rating.

### Links to the trainer
- From a game, "Link to lesson" picks from the curriculum. From a lesson, "My games" lists linked games.
- Optional: when `endgameType` is set, suggest matching lessons to link (matching is by tag, not by analysing the position).

### Export
- JSON (full database) and PGN (all games, with the player's comments embedded as `{ }` annotations).

## 5. Trainer tiers

The curriculum tiers keep their rating-band labels (decided). The no-rating rule applies to the game database only.

## 6. Milestone

Add as **Milestone 7** after the trainer and sync ship: game entry + viewer + list + export, stored via the `games` table from main spec §11. Links to lessons follow in Milestone 8.
