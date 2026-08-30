import { Chess } from 'chess.js'

// A solution tree is hand-authored (spec §2: no engine, ever).
// `moves` keys are SAN and every key is a correct move. `reply` is the
// scripted defender move. Leaf nodes carry `result` instead of a reply.
export type SolutionNode = {
  reply?: string
  moves?: Record<string, SolutionNode>
  result?: 'win' | 'draw'
}

export type Solution = {
  moves: Record<string, SolutionNode>
  wrong?: Record<string, string>
  hints?: string[]
}

export type PositionData = {
  id: string
  tier: number
  lesson: string
  title: string
  fen: string
  sideToMove: 'w' | 'b'
  goal: 'win' | 'draw'
  playerSide: 'w' | 'b'
  intro: string
  solution: Solution
  explanationAfter: string
  // Spec §10: flag hand-authored lines you're not certain of instead of
  // guessing (and never resolve doubt with an engine).
  needsReview?: boolean
  reviewNote?: string
}

// A cursor tracks where we are in the tree during an attempt.
export type Cursor = {
  moves: Record<string, SolutionNode>
  atRoot: boolean
  wrong: Record<string, string>
}

export type MoveOutcome =
  | { kind: 'correct'; reply?: string; next: Cursor }
  | { kind: 'complete'; result: 'win' | 'draw' }
  | { kind: 'wrong'; feedback: string }
  | { kind: 'unknown' }

export function startAttempt(solution: Solution): Cursor {
  return { moves: solution.moves, atRoot: true, wrong: solution.wrong ?? {} }
}

export function applyMove(cursor: Cursor, san: string): MoveOutcome {
  const node = cursor.moves[san]
  if (node) {
    if (node.result) {
      return { kind: 'complete', result: node.result }
    }
    return {
      kind: 'correct',
      reply: node.reply,
      next: { moves: node.moves ?? {}, atRoot: false, wrong: cursor.wrong },
    }
  }
  // The spec's `wrong` map covers named mistakes from the starting position.
  if (cursor.atRoot && cursor.wrong[san]) {
    return { kind: 'wrong', feedback: cursor.wrong[san] }
  }
  return { kind: 'unknown' }
}

// Build-time validation (spec §5): every FEN legal, every SAN legal from its
// node, every path terminates in a result. Returns a list of problems;
// an empty list means the tree is sound.
export function validateSolution(fen: string, solution: Solution): string[] {
  const errors: string[] = []
  let root: Chess
  try {
    root = new Chess(fen)
  } catch (e) {
    return [`illegal FEN: ${fen} (${String(e)})`]
  }

  const wrong = solution.wrong ?? {}
  for (const san of Object.keys(wrong)) {
    if (!tryMove(new Chess(fen), san)) {
      errors.push(`wrong-map move "${san}" is not legal from the start position`)
    }
  }

  walk(root, solution.moves, 'start', errors)
  return errors
}

function tryMove(game: Chess, san: string): boolean {
  try {
    game.move(san)
    return true
  } catch {
    return false
  }
}

function walk(
  game: Chess,
  moves: Record<string, SolutionNode>,
  path: string,
  errors: string[],
): void {
  if (Object.keys(moves).length === 0) {
    errors.push(`node at "${path}" has no moves and no result — path does not terminate`)
    return
  }
  for (const [san, node] of Object.entries(moves)) {
    const branch = new Chess(game.fen())
    if (!tryMove(branch, san)) {
      errors.push(`move "${san}" at "${path}" is not legal`)
      continue
    }
    if (node.result) {
      if (node.reply || node.moves) {
        errors.push(`leaf "${san}" at "${path}" mixes result with reply/moves`)
      }
      continue
    }
    if (!node.reply) {
      errors.push(`node "${san}" at "${path}" has no reply and no result`)
      continue
    }
    if (!tryMove(branch, node.reply)) {
      errors.push(`reply "${node.reply}" after "${san}" at "${path}" is not legal`)
      continue
    }
    walk(branch, node.moves ?? {}, `${path} ${san} ${node.reply}`, errors)
  }
}
