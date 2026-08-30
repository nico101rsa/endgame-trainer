// Pure merge logic for sync (spec §11): local-first, last-write-wins per
// row by updated_at, soft-deleted games propagate. No network in here —
// fully unit-testable.
import type { ProgressData, ProgressItem } from '../progress/store'
import type { GameRecord, JournalData } from '../journal/types'

export type RemoteProgressRow = {
  item_id: string
  kind: string
  attempts: number
  solved: number
  ease: number
  interval_days: number
  lapses: number
  last_seen: string | null
  next_due: string | null
  updated_at: string
}

export type RemoteLessonRead = { lesson_id: string; read_at: string }

export type RemoteGameRow = {
  id: string
  data: GameRecord
  updated_at: string
  deleted: boolean
}

// Rows without a timestamp (pre-sync local data) sort older than any
// timestamped row but newer than "absent".
function ts(value: string | undefined | null): number {
  if (!value) return 0
  const t = Date.parse(value)
  return Number.isNaN(t) ? 0 : t
}

function itemFromRemote(row: RemoteProgressRow): ProgressItem {
  return {
    kind: row.kind === 'principle' ? 'principle' : 'position',
    ease: row.ease,
    intervalDays: row.interval_days,
    lapses: row.lapses,
    lastSeen: row.last_seen ?? '',
    nextDue: row.next_due ?? '',
    ...(row.kind === 'position' ? { attempts: row.attempts, solved: row.solved } : {}),
    updatedAt: row.updated_at,
  }
}

// Single owner of the row shape: always emits updated_at, falling back to
// the caller's clock for pre-sync items that were never stamped.
export function rowFromItem(id: string, item: ProgressItem, fallbackNow: string): RemoteProgressRow {
  return {
    item_id: id,
    kind: item.kind,
    attempts: item.attempts ?? 0,
    solved: item.solved ?? 0,
    ease: item.ease,
    interval_days: item.intervalDays,
    lapses: item.lapses,
    last_seen: item.lastSeen || null,
    next_due: item.nextDue || null,
    updated_at: item.updatedAt ?? fallbackNow,
  }
}

export function mergeProgress(
  local: ProgressData,
  remoteItems: RemoteProgressRow[],
  remoteReads: RemoteLessonRead[],
): { merged: ProgressData; pushItems: string[]; pushReads: string[] } {
  const items = { ...local.items }
  const pushItems: string[] = []
  const remoteById = new Map(remoteItems.map((r) => [r.item_id, r]))

  for (const [id, row] of remoteById) {
    const mine = items[id]
    if (!mine || ts(mine.updatedAt) < ts(row.updated_at)) {
      items[id] = itemFromRemote(row)
    }
  }
  for (const [id, item] of Object.entries(items)) {
    const remote = remoteById.get(id)
    if (!remote || ts(item.updatedAt) > ts(remote.updated_at)) pushItems.push(id)
  }

  // Lesson reads: a read anywhere is a read everywhere (union).
  const lessons = { ...local.lessons }
  for (const read of remoteReads) {
    if (!lessons[read.lesson_id]) lessons[read.lesson_id] = { readAt: read.read_at }
  }
  const remoteReadIds = new Set(remoteReads.map((r) => r.lesson_id))
  const pushReads = Object.keys(lessons).filter((slug) => !remoteReadIds.has(slug))

  return { merged: { ...local, items, lessons }, pushItems, pushReads }
}

export function mergeGames(
  local: JournalData,
  remote: RemoteGameRow[],
  // Local soft-deletes awaiting propagation: id → deleted-at ISO.
  tombstones: Record<string, string>,
): {
  merged: JournalData
  pushGames: string[] // ids to upsert remotely
  pushDeletes: string[] // ids to soft-delete remotely
  clearedTombstones: string[]
} {
  const byId = new Map(local.games.map((g) => [g.id, g]))
  const remoteById = new Map(remote.map((r) => [r.id, r]))
  const pushDeletes: string[] = []
  const clearedTombstones: string[] = []

  for (const row of remote) {
    const tombstone = tombstones[row.id]
    if (row.deleted) {
      // Remote deletion wins over an older local copy.
      const mine = byId.get(row.id)
      if (mine && ts(mine.updatedAt) <= ts(row.updated_at)) byId.delete(row.id)
      if (tombstone) clearedTombstones.push(row.id)
      continue
    }
    if (tombstone) {
      if (ts(tombstone) > ts(row.updated_at)) {
        pushDeletes.push(row.id)
        // The delete also applies locally — e.g. a JSON import may have
        // re-added a copy of the game after the tombstone was recorded.
        byId.delete(row.id)
      } else {
        // The game was edited elsewhere after our delete — resurrect it.
        byId.set(row.id, row.data)
        clearedTombstones.push(row.id)
      }
      continue
    }
    const mine = byId.get(row.id)
    if (!mine || ts(mine.updatedAt) < ts(row.updated_at)) byId.set(row.id, row.data)
  }
  // Tombstones for games the server never saw: nothing to delete remotely.
  for (const id of Object.keys(tombstones)) {
    if (!remoteById.has(id) && !pushDeletes.includes(id)) clearedTombstones.push(id)
  }

  const pushGames = [...byId.values()]
    .filter((g) => {
      const remoteRow = remoteById.get(g.id)
      return !remoteRow || remoteRow.deleted || ts(g.updatedAt) > ts(remoteRow.updated_at)
    })
    .map((g) => g.id)

  return {
    merged: { ...local, games: [...byId.values()] },
    pushGames,
    pushDeletes,
    clearedTombstones,
  }
}
