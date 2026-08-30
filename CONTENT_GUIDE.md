# Content guide

How to author lessons, positions, and solution trees so everything stays consistent. Read this before adding or editing anything under `/content`. (Required by spec §10.)

## Files

Each lesson is two files in `/content/tier<N>/`:

- `<lesson-slug>.md` — the explanation the player reads. Short: one phone screen, plain markdown (paragraphs, `##` sub-headings, `**bold**`, `-` lists). Let the demo boards carry the load; don't describe long move sequences in prose.
- `<lesson-slug>.json` — everything else: metadata, principle cards, demos, test positions.

The slug is kebab-case and is the lesson id everywhere (progress store, SRS, routes).

## Lesson JSON shape

```json
{
  "lesson": "king-opposition",
  "tier": 1,
  "order": 2,
  "title": "King opposition",
  "tagline": "Face-off rules: whoever must move, loses ground",
  "principles": [ ... ],
  "demos": [ ... ],
  "tests": [ ... ]
}
```

- `order` — position within the tier (1-based). Drives listing order; keep them unique per tier.
- `tagline` — one line under the title on lesson lists. Sentence case, no full stop.

## Principle cards

2–5 per lesson. One idea per card, prompt answerable in a sentence. These are SRS flip-cards — write the prompt as a question you'd want to be quizzed on cold in six months.

```json
{ "id": "t1-opposition-p1", "prompt": "...", "answer": "..." }
```

Id convention: `t<tier>-<short-lesson-tag>-p<N>`. The short tag can compress the slug (`opposition` for `king-opposition`) but must be consistent within the lesson.

## Demos

1–3 per lesson. A demo is a scripted walk-through: the player taps Next/Prev, both sides' moves are played for them, and each move carries a note explaining it.

```json
{
  "id": "t1-opposition-d1",
  "title": "The face-off",
  "fen": "8/8/4k3/8/4K3/4P3/8/8 w - - 0 1",
  "orientation": "w",
  "intro": "One line setting the scene before the first move.",
  "steps": [
    { "move": "Kd4", "note": "Why this move." },
    { "move": "Kd6", "note": "What the defender is trying." }
  ]
}
```

- `steps` are SAN, played in sequence from the FEN, sides alternating. The validator replays them; an illegal step fails the build.
- Every step needs a `note`, even if short. The note is the teaching.
- Demos may stop as soon as the idea is shown — no need to reach mate.

## Test positions

4–8 per lesson. The shape is `PositionData` from `src/engine/solutionTree.ts` — see spec §5 for the full example. Id convention: `t<tier>-<short-lesson-tag>-<NN>` (zero-padded).

### Constructing the position

1. **Start from the theory, not from a game.** Pick the idea being tested, then place the minimum material that expresses it. Classical theoretical endgames (opposition, square rule, Lucena, Philidor...) are public knowledge and fine; never copy a position from a book.
2. **Solvable from the lesson's stated idea alone.** If solving needs calculation beyond the tier, or a second idea the lesson hasn't taught, redesign it (spec §10).
3. **Make the margin one tempo wherever possible.** The best test positions have essentially one correct plan: place the kings so that only the thematic move works. If several unrelated moves also achieve the goal, the tree either has to include them all or unfairly reject correct play — tightening the position is better than either.
4. Keep spectator kings/pawns out of the action zone so they can't create side-lines.

### Building the solution tree

- `moves` keys are SAN; every key is correct. `reply` is the *most testing* defence — the one that punishes the wrong follow-up, not the one that rolls over.
- **Include every correct player move at each node**, not just your favourite. If a position turns out to have three winning first moves, either include all three branches or redesign the position (see margin rule above). A correct move the tree rejects is a bug.
- **End early once the technique is demonstrated** (spec §5): a `result` leaf when the pawn promotes with the king covering the square, when the defender captures the last pawn, when the fortress is clearly held. Don't play out to mate.
- Keep trees shallow — 3–6 player moves deep is the sweet spot. If a tree wants to be deeper, the position is testing too much at once; split it.

### Wrong-map and hints

- `wrong` covers instructive mistakes **on the first move only** (the engine applies it at the root — a deliberate simplification, spec-faithful). Deeper mistakes get the generic "That doesn't hold — try again."
- Every `wrong` entry explains *why* the move fails — that's where the learning happens (spec §10). "Loses" is not feedback; "Retreating gives up the opposition" is.
- 1–3 hints, ordered from nudge to near-answer. Hint 1 restates the lesson's question ("Which square takes the opposition?"); the last hint may name the move.
- `intro` states the task in one line; the goal line ("White to play and win") is rendered by the UI, don't repeat it.

### Verifying without an engine

There is no engine, ever — including "just to check" (spec §2). Verification is:

1. Reason each line out from the theory, both the tree's moves and the claim that the defender's replies are best.
2. Run `npm run validate` — it machine-checks FEN legality, SAN legality at every node, tree termination, demo step legality, and lesson shape (card/demo/test counts, id uniqueness).
3. If genuine doubt remains about a line, set `"needsReview": true` on that position and say why in a `"reviewNote"` — never resolve doubt with an engine (spec §10).

## Tone for prose fields

`intro`, `wrong` feedback, hints, notes, `explanationAfter`: direct, second person, one or two sentences. Name squares and moves concretely ("After h5 you're outside the new square") rather than abstractly ("the king is too slow").
