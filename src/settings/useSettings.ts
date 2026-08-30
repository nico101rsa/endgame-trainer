import { useEffect, useState } from 'react'
import type { Settings } from './store'
import { loadSettings, SETTINGS_EVENT } from './store'

export function useSettings(): Settings {
  const [settings, setSettings] = useState(loadSettings)
  useEffect(() => {
    const refresh = () => setSettings(loadSettings())
    window.addEventListener(SETTINGS_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(SETTINGS_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return settings
}
