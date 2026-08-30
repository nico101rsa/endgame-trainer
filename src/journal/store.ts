// Journal persistence (addendum §2: local-first, no accounts). Pure
// transforms + a thin localStorage binding, mirroring the progress store.
import type { GameRecord, JournalData } from './types'

export function emptyJournal(): JournalData {
  return { version: 1, games: [] }
}

// --- pure core -------------------------------------------------------------

export function upsertGame(data: JournalData, game: GameRecord): JournalData {
  const stamped = { ...game, updatedAt: game.updatedAt ?? new Date().toISOString() }
  const games = data.games.some((g) => g.id === game.id)
    ? data.games.map((g) => (g.id === game.id ? stamped : g))
    : [...data.games, stamped]
  return { ...data, games }
}

// Editing call sites stamp the change time so sync's last-write-wins works.
export function touchGame(game: GameRecord): GameRecord {
  return { ...game, updatedAt: new Date().toISOString() }
}

export function removeGame(data: JournalData, id: string): JournalData {
  return { ...data, games: data.games.filter((g) => g.id !== id) }
}

export function newGameId(data: JournalData, date: string): string {
  const base = `g-${date}`
  let n = 1
  while (data.games.some((g) => g.id === `${base}-${String(n).padStart(2, '0')}`)) n++
  return `${base}-${String(n).padStart(2, '0')}`
}

// Autocomplete pools from previous entries, most recent first
// (addendum §4 "recall over retyping" — no separate lookup tables).
export function suggestions(data: JournalData, field: keyof GameRecord): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const game of [...data.games].sort((a, b) => b.date.localeCompare(a.date))) {
    const value = game[field]
    if (typeof value === 'string' && value.trim() && !seen.has(value)) {
      seen.add(value)
      out.push(value)
    }
  }
  return out
}

// Descriptive tallies only — counts of the player's own entries, never a
// performance metric (addendum §4).
export function tallies(games: GameRecord[]) {
  const count = (pred: (g: GameRecord) => boolean) => games.filter(pred).length
  const byKey = (key: (g: GameRecord) => string) => {
    const map = new Map<string, number>()
    for (const g of games) {
      const k = key(g)
      if (k) map.set(k, (map.get(k) ?? 0) + 1)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }
  const wins = (colour?: 'w' | 'b') =>
    count(
      (g) =>
        (colour === undefined || g.colour === colour) &&
        ((g.result === '1-0' && g.colour === 'w') || (g.result === '0-1' && g.colour === 'b')),
    )
  const losses = (colour?: 'w' | 'b') =>
    count(
      (g) =>
        (colour === undefined || g.colour === colour) &&
        ((g.result === '0-1' && g.colour === 'w') || (g.result === '1-0' && g.colour === 'b')),
    )
  const draws = (colour?: 'w' | 'b') =>
    count((g) => (colour === undefined || g.colour === colour) && g.result === '1/2-1/2')
  return {
    played: games.length,
    wins: wins(),
    losses: losses(),
    draws: draws(),
    asWhite: { played: count((g) => g.colour === 'w'), wins: wins('w'), losses: losses('w'), draws: draws('w') },
    asBlack: { played: count((g) => g.colour === 'b'), wins: wins('b'), losses: losses('b'), draws: draws('b') },
    byOpening: byKey((g) => g.opening.trim()),
    byDecider: byKey((g) => g.notes.whatDecidedIt),
  }
}

function isValidJournal(value: unknown): value is JournalData {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return v.version === 1 && Array.isArray(v.games)
}

export function parseJournal(json: string): JournalData {
  const parsed: unknown = JSON.parse(json)
  if (!isValidJournal(parsed)) {
    throw new Error('Not an Endgame Trainer journal export (expected version 1).')
  }
  return parsed
}

// --- localStorage binding --------------------------------------------------

const STORAGE_KEY = 'endgame-trainer:journal'
const DRAFT_KEY = 'endgame-trainer:journal-draft'
export const JOURNAL_EVENT = 'endgame-journal-changed'

export function loadJournal(): JournalData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return parseJournal(raw)
  } catch {
    // Corrupt storage: start fresh rather than crash.
  }
  return emptyJournal()
}

export function saveJournal(data: JournalData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage unavailable — the session still works.
  }
  window.dispatchEvent(new Event(JOURNAL_EVENT))
}

export function updateJournal(fn: (data: JournalData) => JournalData): JournalData {
  const next = fn(loadJournal())
  saveJournal(next)
  return next
}

export function exportJournal(): string {
  return JSON.stringify(loadJournal(), null, 2)
}

export function importJournal(json: string): void {
  saveJournal(parseJournal(json))
}

// Draft autosave (addendum §4): a half-entered game survives navigation.
export function saveDraft(draft: unknown): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Best effort only.
  }
}

export function loadDraft<T>(): T | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Nothing to clear.
  }
}
