import { describe, expect, it } from 'vitest'
import type { ProgressData, ProgressItem } from '../progress/store'
import { emptyProgress } from '../progress/store'
import { emptyJournal } from '../journal/store'
import type { GameRecord } from '../journal/types'
import { emptyNotes } from '../journal/types'
import type { RemoteGameRow, RemoteProgressRow } from './merge'
import { mergeGames, mergeProgress, rowFromItem } from './merge'

const T1 = '2026-08-30T10:00:00.000Z'
const T2 = '2026-08-30T11:00:00.000Z'

function item(updatedAt?: string): ProgressItem {
  return {
    kind: 'position',
    ease: 2.5,
    intervalDays: 1,
    lapses: 0,
    lastSeen: '2026-08-30',
    nextDue: '2026-08-31',
    attempts: 1,
    solved: 1,
    updatedAt,
  }
}

function remoteRow(id: string, updated_at: string): RemoteProgressRow {
  return {
    item_id: id,
    kind: 'position',
    attempts: 5,
    solved: 4,
    ease: 2.2,
    interval_days: 8,
    lapses: 1,
    last_seen: '2026-08-29',
    next_due: '2026-09-06',
    updated_at,
  }
}

function game(id: string, updatedAt?: string): GameRecord {
  return {
    id,
    date: '2026-08-30',
    event: '',
    venue: '',
    timeControl: '',
    colour: 'w',
    opponent: 'X',
    result: '1-0',
    opening: '',
    pgn: '1. e4',
    notes: emptyNotes(),
    phaseReached: '',
    endgameType: '',
    linkedLessons: [],
    tags: [],
    updatedAt,
  }
}

describe('mergeProgress', () => {
  it('newer remote row replaces local; newer local row is pushed', () => {
    const local: ProgressData = {
      ...emptyProgress(),
      items: { stale: item(T1), fresh: item(T2), localOnly: item(T1) },
    }
    const { merged, pushItems } = mergeProgress(
      local,
      [remoteRow('stale', T2), remoteRow('fresh', T1), remoteRow('remoteOnly', T1)],
      [],
    )
    expect(merged.items.stale.intervalDays).toBe(8) // remote won
    expect(merged.items.fresh.intervalDays).toBe(1) // local won
    expect(merged.items.remoteOnly.intervalDays).toBe(8) // pulled
    expect(pushItems.sort()).toEqual(['fresh', 'localOnly'])
  })

  it('untimestamped local rows lose to any remote row but push when remote lacks them', () => {
    const local: ProgressData = { ...emptyProgress(), items: { a: item(undefined) } }
    const { merged, pushItems } = mergeProgress(local, [remoteRow('a', T1)], [])
    expect(merged.items.a.intervalDays).toBe(8)
    expect(pushItems).toEqual([])
  })

  it('lesson reads union both ways', () => {
    const local: ProgressData = {
      ...emptyProgress(),
      lessons: { here: { readAt: '2026-08-30' } },
    }
    const { merged, pushReads } = mergeProgress(local, [], [
      { lesson_id: 'there', read_at: '2026-08-29' },
    ])
    expect(Object.keys(merged.lessons).sort()).toEqual(['here', 'there'])
    expect(pushReads).toEqual(['here'])
  })

  it('rowFromItem round-trips the SRS fields', () => {
    const row = rowFromItem('x', item(T1))
    expect(row).toMatchObject({
      item_id: 'x',
      kind: 'position',
      ease: 2.5,
      interval_days: 1,
      last_seen: '2026-08-30',
      updated_at: T1,
    })
  })
})

describe('mergeGames', () => {
  const remote = (id: string, updated_at: string, deleted = false): RemoteGameRow => ({
    id,
    data: { ...game(id, updated_at), opponent: 'Remote' },
    updated_at,
    deleted,
  })

  it('last write wins per game, both directions', () => {
    const local = { ...emptyJournal(), games: [game('a', T1), game('b', T2)] }
    const { merged, pushGames } = mergeGames(local, [remote('a', T2), remote('b', T1)], {})
    expect(merged.games.find((g) => g.id === 'a')?.opponent).toBe('Remote')
    expect(merged.games.find((g) => g.id === 'b')?.opponent).toBe('X')
    expect(pushGames).toEqual(['b'])
  })

  it('remote soft-delete removes the older local copy', () => {
    const local = { ...emptyJournal(), games: [game('a', T1)] }
    const { merged, pushGames } = mergeGames(local, [remote('a', T2, true)], {})
    expect(merged.games).toEqual([])
    expect(pushGames).toEqual([])
  })

  it('a local edit newer than the remote delete resurrects the game', () => {
    const local = { ...emptyJournal(), games: [game('a', T2)] }
    const { merged, pushGames } = mergeGames(local, [remote('a', T1, true)], {})
    expect(merged.games.map((g) => g.id)).toEqual(['a'])
    expect(pushGames).toEqual(['a'])
  })

  it('local tombstones push deletes when newer, clear when outdated by a remote edit', () => {
    const local = emptyJournal()
    const out = mergeGames(local, [remote('gone', T1), remote('kept', T2)], {
      gone: T2,
      kept: T1,
      unseen: T1,
    })
    expect(out.pushDeletes).toEqual(['gone'])
    expect(out.merged.games.map((g) => g.id)).toEqual(['kept'])
    expect(out.clearedTombstones.sort()).toEqual(['kept', 'unseen'])
  })
})
