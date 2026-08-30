// App settings (spec §6): board theme, piece set, sound. Stored separately
// from progress so a progress reset never touches preferences.

export type BoardTheme = 'parchment' | 'slate' | 'tournament'
export type PieceSet = 'poster' | 'classic'

export type Settings = {
  boardTheme: BoardTheme
  pieceSet: PieceSet
  sound: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  boardTheme: 'parchment',
  pieceSet: 'poster',
  sound: true,
}

const STORAGE_KEY = 'endgame-trainer:settings'
export const SETTINGS_EVENT = 'endgame-settings-changed'

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    // Unreadable storage — fall back to defaults.
  }
  return DEFAULT_SETTINGS
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Settings just won't stick this session.
  }
  window.dispatchEvent(new Event(SETTINGS_EVENT))
  return next
}
