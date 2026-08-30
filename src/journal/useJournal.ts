import { useEffect, useState } from 'react'
import type { JournalData } from './types'
import { JOURNAL_EVENT, loadJournal } from './store'

export function useJournal(): JournalData {
  const [data, setData] = useState(loadJournal)
  useEffect(() => {
    const refresh = () => setData(loadJournal())
    window.addEventListener(JOURNAL_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(JOURNAL_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])
  return data
}
