// Anki-style SM-2 scheduling (spec §5). Pure functions, no storage, no dates
// beyond ISO string arithmetic — the store layer decides *when* to review.
//
// Model: every item carries an ease factor (starts 2.5, floor 1.3) and an
// interval in whole days. New items graduate through learning steps of 1 day
// then 3 days; after that each Good pass multiplies the interval by the ease.
// Intervals cap at 365 days.

export type Grade = 'again' | 'hard' | 'good' | 'easy'

export type SrsState = {
  ease: number
  intervalDays: number
  lapses: number
}

export const EASE_START = 2.5
export const EASE_FLOOR = 1.3
export const MAX_INTERVAL_DAYS = 365

export function newItemState(): SrsState {
  return { ease: EASE_START, intervalDays: 0, lapses: 0 }
}

function cap(days: number): number {
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(days)))
}

function clampEase(ease: number): number {
  return Math.round(Math.max(EASE_FLOOR, ease) * 100) / 100
}

// The spec's grade table:
//   Again — interval resets to 1 day, lapse +1, ease −0.2
//   Hard  — interval ×1.2, ease −0.15
//   Good  — interval × ease (learning items step 0 → 1d → 3d instead)
//   Easy  — interval × ease × 1.3, ease +0.15
// The multiplier formulas assume a graduated interval, so while an item is
// still in the learning steps (interval < 3d): Hard repeats the current step
// and Easy graduates it straight to 4 days.
export function review(state: SrsState, grade: Grade): SrsState {
  const { ease, intervalDays, lapses } = state
  const learning = intervalDays < 3

  switch (grade) {
    case 'again':
      return { ease: clampEase(ease - 0.2), intervalDays: 1, lapses: lapses + 1 }
    case 'hard':
      return {
        ease: clampEase(ease - 0.15),
        intervalDays: learning ? Math.max(1, intervalDays) : cap(intervalDays * 1.2),
        lapses,
      }
    case 'good':
      return {
        ease,
        intervalDays:
          intervalDays < 1 ? 1 : intervalDays < 3 ? 3 : cap(intervalDays * ease),
        lapses,
      }
    case 'easy':
      return {
        ease: clampEase(ease + 0.15),
        intervalDays: learning ? 4 : cap(intervalDays * ease * 1.3),
        lapses,
      }
  }
}

// --- ISO date helpers (local time — a review day is the user's calendar day)

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return toISODate(new Date(y, m - 1, d + days))
}

// ISO dates compare correctly as strings.
export function isDue(nextDue: string, today: string): boolean {
  return nextDue <= today
}
