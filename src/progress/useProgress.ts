import { useEffect, useState } from 'react'
import type { ProgressData } from './store'
import { loadProgress, PROGRESS_EVENT } from './store'

// Live view of stored progress: re-reads after any same-tab save (custom
// event) and after cross-tab writes (native storage event).
export function useProgressData(): ProgressData {
  const [data, setData] = useState(loadProgress)
  useEffect(() => {
    const refresh = () => setData(loadProgress())
    window.addEventListener(PROGRESS_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(PROGRESS_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return data
}
