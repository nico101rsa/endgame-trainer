// Sync engine (spec §11). Local-first: stores stay the working copy; this
// module pulls, merges (last-write-wins per row), and pushes in the
// background. Failed syncs set a pending flag and retry on load/online.
import { loadJournal, saveJournal, JOURNAL_EVENT } from '../journal/store'
import { loadProgress, saveProgress, PROGRESS_EVENT } from '../progress/store'
import { supabase, syncConfigured } from './client'
import type { RemoteGameRow, RemoteLessonRead, RemoteProgressRow } from './merge'
import { mergeGames, mergeProgress, rowFromItem } from './merge'

type SyncState = {
  lastSync?: string
  // The account the local stores were last synced with. Guards a shared
  // browser: switching accounts must not push one user's local data into
  // another's rows (spec §11 is single-user, but sign-out/sign-in happens).
  userId?: string
  pending: boolean
  tombstones: Record<string, string>
}

const STATE_KEY = 'endgame-trainer:sync'
export const SYNC_EVENT = 'endgame-sync-changed'

export function getSyncState(): SyncState {
  try {
    const raw = localStorage.getItem(STATE_KEY)
    if (raw) return { pending: false, tombstones: {}, ...(JSON.parse(raw) as Partial<SyncState>) }
  } catch {
    // Fall through to defaults.
  }
  return { pending: false, tombstones: {} }
}

function setSyncState(patch: Partial<SyncState>) {
  const next = { ...getSyncState(), ...patch }
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(next))
  } catch {
    // Best effort.
  }
  window.dispatchEvent(new Event(SYNC_EVENT))
}

// Journal deletions are recorded here so they propagate as soft-deletes
// instead of being resurrected by the other device.
export function noteGameDeleted(id: string) {
  setSyncState({ tombstones: { ...getSyncState().tombstones, [id]: new Date().toISOString() } })
  scheduleSync()
}

// A JSON import is an explicit statement of the desired journal: games it
// dropped become deletions, games it (re)contains must not be tombstoned.
export function reconcileImport(previousIds: string[], importedIds: string[]) {
  const imported = new Set(importedIds)
  const now = new Date().toISOString()
  const tombstones = { ...getSyncState().tombstones }
  for (const id of importedIds) delete tombstones[id]
  for (const id of previousIds) if (!imported.has(id)) tombstones[id] = now
  setSyncState({ tombstones })
  scheduleSync()
}

let syncing = false
let timer: ReturnType<typeof setTimeout> | null = null

export function scheduleSync(delayMs = 2500) {
  if (!syncConfigured) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void syncNow()
  }, delayMs)
}

export type SyncResult = { ok: boolean; message: string }

export async function syncNow(): Promise<SyncResult> {
  if (!supabase) return { ok: false, message: 'Sync is not configured.' }
  if (syncing) return { ok: false, message: 'Sync already running.' }
  // Set before the first await so a concurrent call can't slip past.
  syncing = true
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) return { ok: false, message: 'Not signed in.' }
    const userId = session.user.id

    // Account switch on a shared browser: the local stores belong to the
    // previous account (already synced to its server rows). Start this
    // account from its own server copy instead of cross-pushing.
    const stateBefore = getSyncState()
    if (stateBefore.userId && stateBefore.userId !== userId) {
      saveProgress({ version: 2, items: {}, lessons: {} })
      saveJournal({ version: 1, games: [] })
      setSyncState({ tombstones: {}, lastSync: undefined })
    }

    // Pull (RLS scopes every select to this user).
    const [progressRes, readsRes, gamesRes] = await Promise.all([
      supabase.from('progress').select('*'),
      supabase.from('lesson_reads').select('*'),
      supabase.from('games').select('*'),
    ])
    const firstError = progressRes.error ?? readsRes.error ?? gamesRes.error
    if (firstError) throw new Error(firstError.message)

    // Merge + write local. The store events these saves fire are ignored by
    // the change listeners while `syncing` is true, so a sync can't schedule
    // itself into an endless loop.
    const progress = mergeProgress(
      loadProgress(),
      (progressRes.data ?? []) as RemoteProgressRow[],
      (readsRes.data ?? []) as RemoteLessonRead[],
    )
    saveProgress(progress.merged)
    const state = getSyncState()
    const games = mergeGames(loadJournal(), (gamesRes.data ?? []) as RemoteGameRow[], state.tombstones)
    saveJournal(games.merged)

    // Push what's newer locally.
    const now = new Date().toISOString()
    if (progress.pushItems.length > 0) {
      const rows = progress.pushItems.map((id) => ({
        user_id: userId,
        ...rowFromItem(id, progress.merged.items[id], now),
      }))
      const { error } = await supabase.from('progress').upsert(rows)
      if (error) throw new Error(error.message)
    }
    if (progress.pushReads.length > 0) {
      const rows = progress.pushReads.map((slug) => ({
        user_id: userId,
        lesson_id: slug,
        read_at: progress.merged.lessons[slug].readAt,
      }))
      const { error } = await supabase.from('lesson_reads').upsert(rows)
      if (error) throw new Error(error.message)
    }
    if (games.pushGames.length > 0) {
      const byId = new Map(games.merged.games.map((g) => [g.id, g]))
      const rows = games.pushGames.map((id) => ({
        id,
        user_id: userId,
        data: byId.get(id),
        updated_at: byId.get(id)?.updatedAt ?? now,
        deleted: false,
      }))
      const { error } = await supabase.from('games').upsert(rows)
      if (error) throw new Error(error.message)
    }
    if (games.pushDeletes.length > 0) {
      const rows = games.pushDeletes.map((id) => ({
        id,
        user_id: userId,
        data: {},
        updated_at: state.tombstones[id] ?? now,
        deleted: true,
      }))
      const { error } = await supabase.from('games').upsert(rows)
      if (error) throw new Error(error.message)
    }

    // Clear propagated tombstones.
    const tombstones = { ...getSyncState().tombstones }
    for (const id of [...games.clearedTombstones, ...games.pushDeletes]) delete tombstones[id]
    setSyncState({ lastSync: now, pending: false, tombstones, userId })
    return { ok: true, message: 'Synced.' }
  } catch (e) {
    setSyncState({ pending: true })
    return { ok: false, message: e instanceof Error ? e.message : 'Sync failed.' }
  } finally {
    syncing = false
  }
}

// "Reset progress" while signed in must clear the server copy too, or the
// next sync pulls everything straight back (spec §11 has no per-item
// tombstones for progress — a reset is a full wipe of this user's rows).
export async function wipeRemoteProgress(): Promise<SyncResult> {
  if (!supabase) return { ok: true, message: 'Sync not configured.' }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { ok: true, message: 'Not signed in.' }
  const userId = session.user.id
  const [a, b] = await Promise.all([
    supabase.from('progress').delete().eq('user_id', userId),
    supabase.from('lesson_reads').delete().eq('user_id', userId),
  ])
  const error = a.error ?? b.error
  if (error) return { ok: false, message: error.message }
  return { ok: true, message: 'Server copy cleared.' }
}

// Wire the background behaviour once at app start (spec §11 "on change" /
// "on load" rules).
let initialised = false
export function initSync() {
  if (initialised || !syncConfigured || !supabase) return
  initialised = true
  // Store events fired by syncNow's own saves arrive while `syncing` is
  // true and are dropped here — only real user changes schedule a sync.
  const onChange = () => {
    if (!syncing) scheduleSync()
  }
  window.addEventListener(PROGRESS_EVENT, onChange)
  window.addEventListener(JOURNAL_EVENT, onChange)
  window.addEventListener('online', () => scheduleSync(500))
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') scheduleSync(500)
  })
  if (getSyncState().pending) scheduleSync(1000)
}
