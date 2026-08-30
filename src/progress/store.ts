// Progress persistence (spec §5, localStorage v2). The scheduling math lives
// in srs.ts; this module owns the stored shape. Core transforms are pure —
// (data, today) in, new data out — so they unit-test in plain Node; the thin
// wrappers at the bottom bind them to localStorage.
import type { Grade, SrsState } from './srs'
import { addDays, isDue, newItemState, review, todayISO } from './srs'

export type ItemKind = 'position' | 'principle'

export type ProgressItem = SrsState & {
  kind: ItemKind
  lastSeen: string
  nextDue: string
  // Positions only — lifetime counters, independent of the SRS state.
  attempts?: number
  solved?: number
  // Sync (spec §11): last-write-wins per row. Absent on pre-sync data —
  // treated as older than any timestamped row.
  updatedAt?: string
}

export type ProgressData = {
  version: 2
  items: Record<string, ProgressItem>
  lessons: Record<string, { readAt: string }>
}

export function emptyProgress(): ProgressData {
  return { version: 2, items: {}, lessons: {} }
}

// --- pure core -------------------------------------------------------------

function reviewed(prev: SrsState, kind: ItemKind, grade: Grade, today: string): ProgressItem {
  const next = review(prev, grade)
  return {
    kind,
    ...next,
    lastSeen: today,
    nextDue: addDays(today, next.intervalDays),
    updatedAt: new Date().toISOString(),
  }
}

// A test-position attempt grades itself (spec §5): clean = good, hinted =
// hard, failed or solution shown = again. Positions never grade easy.
export function gradePosition(
  data: ProgressData,
  id: string,
  grade: Grade,
  today: string,
): ProgressData {
  const prev = data.items[id]
  const item = reviewed(prev ?? newItemState(), 'position', grade, today)
  item.attempts = (prev?.attempts ?? 0) + 1
  item.solved = (prev?.solved ?? 0) + (grade === 'again' ? 0 : 1)
  return { ...data, items: { ...data.items, [id]: item } }
}

export function gradeCard(
  data: ProgressData,
  id: string,
  grade: Grade,
  today: string,
): ProgressData {
  const item = reviewed(data.items[id] ?? newItemState(), 'principle', grade, today)
  return { ...data, items: { ...data.items, [id]: item } }
}

// First read of a lesson enters its principle cards into the review queue
// (spec §5): each card becomes a new item due today. Re-reads change nothing.
export function markLessonRead(
  data: ProgressData,
  slug: string,
  cardIds: string[],
  today: string,
): ProgressData {
  if (data.lessons[slug]) return data
  const items = { ...data.items }
  for (const id of cardIds) {
    if (!items[id]) {
      items[id] = {
        kind: 'principle',
        ...newItemState(),
        lastSeen: today,
        nextDue: today,
        updatedAt: new Date().toISOString(),
      }
    }
  }
  return { ...data, items, lessons: { ...data.lessons, [slug]: { readAt: today } } }
}

export function dueItemIds(data: ProgressData, today: string): string[] {
  return Object.keys(data.items).filter((id) => isDue(data.items[id].nextDue, today))
}

// A position counts as "done" for progress bars once it has ever been solved.
export function isPositionSolved(data: ProgressData, id: string): boolean {
  return (data.items[id]?.solved ?? 0) > 0
}

function isValidProgress(value: unknown): value is ProgressData {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return v.version === 2 && typeof v.items === 'object' && v.items !== null
    && typeof v.lessons === 'object' && v.lessons !== null
}

export function parseProgress(json: string): ProgressData {
  const parsed: unknown = JSON.parse(json)
  if (!isValidProgress(parsed)) {
    throw new Error('Not an Endgame Trainer progress export (expected version 2).')
  }
  return parsed
}

// --- localStorage binding --------------------------------------------------

const STORAGE_KEY = 'endgame-trainer:progress'
// Same-tab notifications so Home refreshes counts after a review session.
export const PROGRESS_EVENT = 'endgame-progress-changed'

export function loadProgress(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return parseProgress(raw)
  } catch {
    // Corrupt or unreadable storage — start fresh rather than crash.
  }
  return emptyProgress()
}

export function saveProgress(data: ProgressData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage full/unavailable: the session still works, it just won't stick.
  }
  window.dispatchEvent(new Event(PROGRESS_EVENT))
}

export function updateProgress(fn: (data: ProgressData, today: string) => ProgressData): ProgressData {
  const next = fn(loadProgress(), todayISO())
  saveProgress(next)
  return next
}

export function exportProgress(): string {
  return JSON.stringify(loadProgress(), null, 2)
}

export function importProgress(json: string): void {
  saveProgress(parseProgress(json))
}

export function resetProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing stored, nothing lost.
  }
  window.dispatchEvent(new Event(PROGRESS_EVENT))
}
