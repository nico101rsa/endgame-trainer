// OTB game journal shapes (addendum §3). Hard rules from addendum §2:
// no engine or computer assessment anywhere, and no rating fields — do not
// add any, even optional ones. All judgement text is the player's own.

export type PhaseReached = 'opening' | 'middlegame' | 'endgame'

export const WHAT_DECIDED_IT = [
  'opening',
  'middlegame',
  'endgame',
  'time',
  'mistake',
  'opponent-quality',
  'other',
] as const
export type WhatDecidedIt = (typeof WHAT_DECIDED_IT)[number]

export type PgnResult = '1-0' | '0-1' | '1/2-1/2' | '*'

export type GameNotes = {
  summary: string
  turningPoint: string
  whatDecidedIt: WhatDecidedIt | ''
  lessons: string
  // Keyed by half-move number (1 = White's first move, 2 = Black's reply…),
  // matching the viewer's step index.
  moveComments: Record<string, string>
}

export type GameRecord = {
  id: string
  date: string // ISO yyyy-mm-dd
  event: string
  venue: string
  timeControl: string
  colour: 'w' | 'b'
  opponent: string
  result: PgnResult
  opening: string
  pgn: string // movetext only (no headers); validated SAN
  notes: GameNotes
  phaseReached: PhaseReached | ''
  endgameType: string
  linkedLessons: string[]
  tags: string[]
  // Sync (spec §11): last-write-wins per game. Absent on pre-sync data.
  updatedAt?: string
}

export type JournalData = {
  version: 1
  games: GameRecord[]
}

export function emptyNotes(): GameNotes {
  return { summary: '', turningPoint: '', whatDecidedIt: '', lessons: '', moveComments: {} }
}

// Player-perspective result label ⇄ stored PGN result (addendum §3).
export function resultLabel(result: PgnResult, colour: 'w' | 'b'): 'Win' | 'Loss' | 'Draw' | '—' {
  if (result === '1/2-1/2') return 'Draw'
  if (result === '*') return '—'
  const whiteWon = result === '1-0'
  return whiteWon === (colour === 'w') ? 'Win' : 'Loss'
}

export function resultFromLabel(label: 'Win' | 'Loss' | 'Draw', colour: 'w' | 'b'): PgnResult {
  if (label === 'Draw') return '1/2-1/2'
  const win = label === 'Win'
  return win === (colour === 'w') ? '1-0' : '0-1'
}
