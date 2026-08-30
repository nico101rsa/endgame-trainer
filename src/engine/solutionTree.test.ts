import { describe, expect, it } from 'vitest'
import { applyMove, startAttempt, validateSolution } from './solutionTree'
import type { Solution } from './solutionTree'

// The spec §5 sample position, inlined so the engine tests don't depend on
// the content pipeline (the same position ships as t1-opposition-03).
const fen = '8/8/4k3/8/4K3/4P3/8/8 w - - 0 1'
const solution: Solution = {
  moves: {
    Kd4: {
      reply: 'Kd6',
      moves: { e4: { reply: 'Ke6', moves: { Kc5: { result: 'win' } } } },
    },
    Kf4: {
      reply: 'Kf6',
      moves: { e4: { reply: 'Ke6', moves: { Kg5: { result: 'win' } } } },
    },
  },
  wrong: {
    Kd3: 'Retreating gives up the opposition.',
    Kf3: "Retreating gives up the opposition — Black's king walks forward.",
  },
  hints: [
    "Which square puts your king directly in front of Black's king with one square between?",
    'Kd4 or Kf4 both take the opposition.',
  ],
}

describe('applyMove', () => {
  it('walks a full correct line to the result', () => {
    let cursor = startAttempt(solution)

    const first = applyMove(cursor, 'Kd4')
    expect(first.kind).toBe('correct')
    if (first.kind !== 'correct') return
    expect(first.reply).toBe('Kd6')
    cursor = first.next

    const second = applyMove(cursor, 'e4')
    expect(second.kind).toBe('correct')
    if (second.kind !== 'correct') return
    expect(second.reply).toBe('Ke6')
    cursor = second.next

    const third = applyMove(cursor, 'Kc5')
    expect(third).toEqual({ kind: 'complete', result: 'win' })
  })

  it('accepts the alternative correct first move Kf4', () => {
    const outcome = applyMove(startAttempt(solution), 'Kf4')
    expect(outcome.kind).toBe('correct')
    if (outcome.kind !== 'correct') return
    expect(outcome.reply).toBe('Kf6')
  })

  it('returns the authored feedback for a named wrong move', () => {
    const outcome = applyMove(startAttempt(solution), 'Kd3')
    expect(outcome).toEqual({
      kind: 'wrong',
      feedback: 'Retreating gives up the opposition.',
    })
  })

  it('returns unknown for a move that is neither correct nor named', () => {
    // applyMove never checks legality (the board does); tree-wise this is unknown.
    expect(applyMove(startAttempt(solution), 'Kb2')).toEqual({ kind: 'unknown' })
  })

  it('does not apply the root wrong map deeper in the tree', () => {
    const first = applyMove(startAttempt(solution), 'Kd4')
    if (first.kind !== 'correct') throw new Error('expected correct')
    // e4 is correct here; Kd3 (named wrong at the root) is just unknown now.
    expect(applyMove(first.next, 'Kd3')).toEqual({ kind: 'unknown' })
  })
})

describe('validateSolution', () => {
  it('accepts the spec position', () => {
    expect(validateSolution(fen, solution)).toEqual([])
  })

  it('rejects an illegal FEN', () => {
    const errors = validateSolution('not-a-fen', solution)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('illegal FEN')
  })

  it('rejects an illegal SAN in the tree', () => {
    const bad: Solution = { moves: { Ka1: { result: 'win' } } }
    const errors = validateSolution(fen, bad)
    expect(errors.some((e) => e.includes('"Ka1"') && e.includes('not legal'))).toBe(true)
  })

  it('rejects an illegal scripted reply', () => {
    const bad: Solution = {
      moves: { Kd4: { reply: 'Ka8', moves: { e4: { result: 'win' } } } },
    }
    const errors = validateSolution(fen, bad)
    expect(errors.some((e) => e.includes('reply "Ka8"'))).toBe(true)
  })

  it('rejects a path that never terminates in a result', () => {
    const bad: Solution = { moves: { Kd4: { reply: 'Kd6', moves: {} } } }
    const errors = validateSolution(fen, bad)
    expect(errors.some((e) => e.includes('does not terminate'))).toBe(true)
  })

  it('rejects a node with neither reply nor result', () => {
    const bad: Solution = { moves: { Kd4: {} } }
    const errors = validateSolution(fen, bad)
    expect(errors.some((e) => e.includes('no reply and no result'))).toBe(true)
  })

  it('rejects a wrong-map move that is not legal', () => {
    const bad: Solution = {
      moves: { Kd4: { result: 'win' } },
      wrong: { Qh5: 'no queen on the board' },
    }
    const errors = validateSolution(fen, bad)
    expect(errors.some((e) => e.includes('wrong-map move "Qh5"'))).toBe(true)
  })
})
