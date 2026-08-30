import { describe, expect, it } from 'vitest'
import {
  addDays,
  isDue,
  newItemState,
  review,
  toISODate,
} from './srs'

describe('review — learning steps', () => {
  it('graduates a new item through 1d then 3d, then multiplies by ease', () => {
    let s = newItemState()
    s = review(s, 'good')
    expect(s.intervalDays).toBe(1)
    s = review(s, 'good')
    expect(s.intervalDays).toBe(3)
    s = review(s, 'good')
    expect(s.intervalDays).toBe(8) // round(3 × 2.5)
    expect(s.ease).toBe(2.5) // Good never moves the ease
    expect(s.lapses).toBe(0)
  })

  it('Hard repeats the current learning step', () => {
    const s = review({ ease: 2.5, intervalDays: 1, lapses: 0 }, 'hard')
    expect(s.intervalDays).toBe(1)
    expect(s.ease).toBe(2.35)
  })

  it('Hard on a brand-new item still schedules at least a day out', () => {
    const s = review(newItemState(), 'hard')
    expect(s.intervalDays).toBe(1)
  })

  it('Easy graduates a learning item straight to 4 days', () => {
    const s = review(newItemState(), 'easy')
    expect(s.intervalDays).toBe(4)
    expect(s.ease).toBe(2.65)
  })
})

describe('review — graduated items', () => {
  it('Good multiplies the interval by the ease', () => {
    const s = review({ ease: 2.5, intervalDays: 10, lapses: 0 }, 'good')
    expect(s.intervalDays).toBe(25)
  })

  it('Hard multiplies by 1.2 and drops ease by 0.15', () => {
    const s = review({ ease: 2.5, intervalDays: 10, lapses: 0 }, 'hard')
    expect(s.intervalDays).toBe(12)
    expect(s.ease).toBe(2.35)
  })

  it('Easy multiplies by ease × 1.3 and raises ease by 0.15', () => {
    const s = review({ ease: 2.5, intervalDays: 10, lapses: 0 }, 'easy')
    expect(s.intervalDays).toBe(33) // round(10 × 2.5 × 1.3)
    expect(s.ease).toBe(2.65)
  })

  it('Again resets to 1 day, counts a lapse, drops ease by 0.2', () => {
    const s = review({ ease: 2.5, intervalDays: 40, lapses: 1 }, 'again')
    expect(s).toEqual({ ease: 2.3, intervalDays: 1, lapses: 2 })
  })

  it('ease never falls below the 1.3 floor', () => {
    let s = { ease: 1.35, intervalDays: 5, lapses: 0 }
    s = review(s, 'again')
    expect(s.ease).toBe(1.3)
    s = review(s, 'hard')
    expect(s.ease).toBe(1.3)
  })

  it('intervals cap at 365 days', () => {
    const s = review({ ease: 2.5, intervalDays: 300, lapses: 0 }, 'good')
    expect(s.intervalDays).toBe(365)
    const easy = review({ ease: 2.5, intervalDays: 365, lapses: 0 }, 'easy')
    expect(easy.intervalDays).toBe(365)
  })
})

describe('date helpers', () => {
  it('formats and adds days across month boundaries', () => {
    expect(toISODate(new Date(2026, 7, 30))).toBe('2026-08-30')
    expect(addDays('2026-08-30', 3)).toBe('2026-09-02')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('isDue compares ISO dates inclusively', () => {
    expect(isDue('2026-08-30', '2026-08-30')).toBe(true)
    expect(isDue('2026-08-29', '2026-08-30')).toBe(true)
    expect(isDue('2026-09-01', '2026-08-30')).toBe(false)
  })
})
