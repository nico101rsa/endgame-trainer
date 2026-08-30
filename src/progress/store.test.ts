import { describe, expect, it } from 'vitest'
import {
  dueItemIds,
  emptyProgress,
  gradeCard,
  gradePosition,
  isPositionSolved,
  markLessonRead,
  parseProgress,
} from './store'

const TODAY = '2026-08-30'

describe('gradePosition', () => {
  it('creates the item on first attempt and schedules it', () => {
    const data = gradePosition(emptyProgress(), 't1-x-01', 'good', TODAY)
    const item = data.items['t1-x-01']
    expect(item.kind).toBe('position')
    expect(item.attempts).toBe(1)
    expect(item.solved).toBe(1)
    expect(item.intervalDays).toBe(1) // first learning step
    expect(item.nextDue).toBe('2026-08-31')
    expect(item.lastSeen).toBe(TODAY)
  })

  it('a failed attempt counts an attempt but not a solve, and lapses', () => {
    let data = gradePosition(emptyProgress(), 't1-x-01', 'good', TODAY)
    data = gradePosition(data, 't1-x-01', 'again', TODAY)
    const item = data.items['t1-x-01']
    expect(item.attempts).toBe(2)
    expect(item.solved).toBe(1)
    expect(item.lapses).toBe(1)
    expect(isPositionSolved(data, 't1-x-01')).toBe(true)
  })
})

describe('markLessonRead', () => {
  it('seeds the lesson cards as due today, once', () => {
    let data = markLessonRead(emptyProgress(), 'king-opposition', ['p1', 'p2'], TODAY)
    expect(data.lessons['king-opposition'].readAt).toBe(TODAY)
    expect(data.items['p1'].kind).toBe('principle')
    expect(data.items['p1'].nextDue).toBe(TODAY)

    // Review a card, then re-read the lesson: the reviewed card keeps its
    // schedule and readAt is unchanged.
    data = gradeCard(data, 'p1', 'good', TODAY)
    const scheduled = data.items['p1']
    const again = markLessonRead(data, 'king-opposition', ['p1', 'p2'], '2026-09-05')
    expect(again).toBe(data)
    expect(again.items['p1']).toEqual(scheduled)
  })
})

describe('dueItemIds', () => {
  it('returns items with nextDue on or before today', () => {
    let data = markLessonRead(emptyProgress(), 'l', ['p1'], TODAY)
    data = gradePosition(data, 'pos1', 'good', TODAY) // due tomorrow
    expect(dueItemIds(data, TODAY)).toEqual(['p1'])
    expect(dueItemIds(data, '2026-08-31').sort()).toEqual(['p1', 'pos1'])
  })
})

describe('parseProgress', () => {
  it('round-trips an export and rejects foreign JSON', () => {
    const data = gradePosition(emptyProgress(), 'pos1', 'hard', TODAY)
    expect(parseProgress(JSON.stringify(data))).toEqual(data)
    expect(() => parseProgress('{"version":1}')).toThrow(/version 2/)
    expect(() => parseProgress('[]')).toThrow()
  })
})
