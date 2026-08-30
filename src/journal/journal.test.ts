import { describe, expect, it } from 'vitest'
import { journalToPgn, movesToPgn, parsePgn, recordToPgn } from './pgn'
import { emptyJournal, newGameId, suggestions, tallies, upsertGame } from './store'
import type { GameRecord } from './types'
import { emptyNotes, resultFromLabel, resultLabel } from './types'

function game(overrides: Partial<GameRecord>): GameRecord {
  return {
    id: 'g-2026-08-30-01',
    date: '2026-08-30',
    event: 'Club night',
    venue: 'Norths',
    timeControl: '90+30',
    colour: 'w',
    opponent: 'J. Smith',
    result: '1-0',
    opening: 'QGD',
    pgn: '1. d4 d5 2. c4 e6',
    notes: emptyNotes(),
    phaseReached: 'middlegame',
    endgameType: '',
    linkedLessons: [],
    tags: [],
    ...overrides,
  }
}

describe('parsePgn', () => {
  it('keeps allowed headers and strips every rating tag', () => {
    const parsed = parsePgn(
      [
        '[Event "Club championship"]',
        '[Site "Norths"]',
        '[WhiteElo "1745"]',
        '[BlackElo "1820"]',
        '[WhiteRatingDiff "+7"]',
        '[Result "1-0"]',
        '',
        '1. e4 e5 2. Nf3 1-0',
      ].join('\n'),
    )
    expect(parsed.moves).toEqual(['e4', 'e5', 'Nf3'])
    expect(parsed.headers.Event).toBe('Club championship')
    expect(parsed.result).toBe('1-0')
    expect(JSON.stringify(parsed.headers)).not.toMatch(/Elo|Rating/i)
  })

  it('scrubs engine eval annotations from comments', () => {
    const parsed = parsePgn('1. e4 {[%eval 0.3] my idea} e5 2. Nf3 *')
    expect(parsed.moves).toEqual(['e4', 'e5', 'Nf3'])
  })

  it('throws on illegal moves', () => {
    expect(() => parsePgn('1. e5 e4')).toThrow()
  })
})

describe('PGN export', () => {
  it('embeds player comments at their half-move and never invents tags', () => {
    const g = game({
      notes: { ...emptyNotes(), moveComments: { '2': 'Solid.', '4': 'Too passive?' } },
    })
    const pgn = recordToPgn(g)
    expect(pgn).toContain('1. d4 d5 {Solid.} 2. c4 e6 {Too passive?} 1-0')
    expect(pgn).toContain('[White "Me"]')
    expect(pgn).toContain('[Black "J. Smith"]')
    expect(pgn).not.toMatch(/Elo/)
    // Round-trips through the parser.
    expect(parsePgn(pgn).moves).toEqual(['d4', 'd5', 'c4', 'e6'])
  })

  it('joins multiple games', () => {
    const out = journalToPgn([game({}), game({ id: 'x', colour: 'b' })])
    expect(out.match(/\[Event /g)?.length).toBe(2)
  })

  it('movesToPgn numbers full moves', () => {
    expect(movesToPgn(['e4', 'e5', 'Nf3'])).toBe('1. e4 e5 2. Nf3')
  })
})

describe('results from the player perspective', () => {
  it('maps label to stored PGN result by colour', () => {
    expect(resultFromLabel('Win', 'w')).toBe('1-0')
    expect(resultFromLabel('Win', 'b')).toBe('0-1')
    expect(resultFromLabel('Loss', 'b')).toBe('1-0')
    expect(resultLabel('0-1', 'b')).toBe('Win')
    expect(resultLabel('1/2-1/2', 'w')).toBe('Draw')
  })
})

describe('store helpers', () => {
  it('ids increment per date and suggestions come newest-first, deduped', () => {
    let data = emptyJournal()
    expect(newGameId(data, '2026-08-30')).toBe('g-2026-08-30-01')
    data = upsertGame(data, game({ id: 'g-2026-08-30-01', venue: 'Norths' }))
    data = upsertGame(data, game({ id: 'g-2026-08-31-01', date: '2026-08-31', venue: 'City club' }))
    data = upsertGame(data, game({ id: 'g-2026-09-01-01', date: '2026-09-01', venue: 'Norths' }))
    expect(newGameId(data, '2026-08-30')).toBe('g-2026-08-30-02')
    expect(suggestions(data, 'venue')).toEqual(['Norths', 'City club'])
  })

  it('tallies are descriptive counts by colour, opening and decider', () => {
    const games = [
      game({ id: 'a', colour: 'w', result: '1-0', opening: 'QGD' }),
      game({ id: 'b', colour: 'b', result: '1-0', opening: 'QGD' }),
      game({
        id: 'c',
        colour: 'b',
        result: '1/2-1/2',
        opening: 'Caro-Kann',
        notes: { ...emptyNotes(), whatDecidedIt: 'endgame' },
      }),
    ]
    const t = tallies(games)
    expect(t.played).toBe(3)
    expect(t.wins).toBe(1)
    expect(t.losses).toBe(1)
    expect(t.draws).toBe(1)
    expect(t.asWhite.wins).toBe(1)
    expect(t.asBlack.losses).toBe(1)
    expect(t.byOpening[0]).toEqual(['QGD', 2])
    expect(t.byDecider).toEqual([['endgame', 1]])
  })
})
