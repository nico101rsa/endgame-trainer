// PGN in/out for the journal. Import strips rating and engine material
// (addendum §2/§4); export embeds the player's own comments as `{ }`.
import { Chess } from 'chess.js'
import type { GameRecord, PgnResult } from './types'

// Header tags kept on paste (addendum §4); everything else — Elo, rating
// diffs, engine/annotator tags — is dropped.
const KEPT_TAGS = new Set([
  'Date',
  'Event',
  'Site',
  'Round',
  'White',
  'Black',
  'Result',
  'TimeControl',
  'ECO',
  'Opening',
])

export type ParsedPgn = {
  moves: string[] // SAN, validated legal from the start position
  headers: Partial<Record<string, string>>
  result: PgnResult
}

// Parse pasted PGN: validate the moves with chess.js, keep only the allowed
// headers, and scrub engine annotations ([%eval …]) from any comments.
export function parsePgn(raw: string): ParsedPgn {
  const cleaned = raw
    .split('\n')
    .filter((line) => {
      const m = line.match(/^\s*\[(\w+)\s/)
      if (!m) return true
      const tag = m[1]
      if (/elo|rating|ratingdiff/i.test(tag)) return false
      return KEPT_TAGS.has(tag)
    })
    .join('\n')
    // Engine eval / clock annotations inside comments are computer material.
    .replace(/\[%\w+[^\]]*\]/g, '')

  const game = new Chess()
  game.loadPgn(cleaned) // throws on illegal moves — caller reports it
  const headers: Partial<Record<string, string>> = {}
  for (const [k, v] of Object.entries(game.getHeaders())) {
    // chess.js fills absent seven-tag-roster headers with "?"/"????.??.??" —
    // treat any all-placeholder value as missing.
    if (KEPT_TAGS.has(k) && v && !/^[?.]+$/.test(v)) headers[k] = v
  }
  const tagResult = headers['Result']
  const result: PgnResult =
    tagResult === '1-0' || tagResult === '0-1' || tagResult === '1/2-1/2' ? tagResult : '*'
  return { moves: game.history(), headers, result }
}

// Movetext only, no comments — the canonical stored form.
export function movesToPgn(moves: string[]): string {
  const parts: string[] = []
  moves.forEach((san, i) => {
    if (i % 2 === 0) parts.push(`${i / 2 + 1}.`)
    parts.push(san)
  })
  return parts.join(' ')
}

export function movesFromRecord(record: GameRecord): string[] {
  if (!record.pgn.trim()) return []
  const game = new Chess()
  game.loadPgn(record.pgn)
  return game.history()
}

// Full PGN export of one game, player comments embedded after their
// half-move (addendum §5 export).
export function recordToPgn(record: GameRecord): string {
  const white = record.colour === 'w' ? 'Me' : record.opponent || '?'
  const black = record.colour === 'b' ? 'Me' : record.opponent || '?'
  const headers = [
    ['Event', record.event || '?'],
    ['Site', record.venue || '?'],
    ['Date', record.date ? record.date.replaceAll('-', '.') : '????.??.??'],
    ['White', white],
    ['Black', black],
    ['Result', record.result],
    ['TimeControl', record.timeControl || '?'],
    ['Opening', record.opening || '?'],
  ]
    .map(([k, v]) => `[${k} "${String(v).replace(/"/g, "'")}"]`)
    .join('\n')

  const moves = movesFromRecord(record)
  const parts: string[] = []
  moves.forEach((san, i) => {
    if (i % 2 === 0) parts.push(`${i / 2 + 1}.`)
    parts.push(san)
    const comment = record.notes.moveComments[String(i + 1)]
    if (comment) parts.push(`{${comment.replace(/[{}]/g, '')}}`)
  })
  parts.push(record.result)
  return `${headers}\n\n${parts.join(' ')}\n`
}

export function journalToPgn(games: GameRecord[]): string {
  return games.map(recordToPgn).join('\n')
}
