import { useEffect, useState } from 'react'
import { supabase, syncConfigured } from './client'
import { getSyncState, SYNC_EVENT } from './engine'

export function useSyncAccount() {
  const [email, setEmail] = useState<string | null>(null)
  const [state, setState] = useState(getSyncState)

  useEffect(() => {
    if (!supabase) return
    void supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null)
    })
    const refresh = () => setState(getSyncState())
    window.addEventListener(SYNC_EVENT, refresh)
    return () => {
      sub.subscription.unsubscribe()
      window.removeEventListener(SYNC_EVENT, refresh)
    }
  }, [])

  return {
    configured: syncConfigured,
    email,
    lastSync: state.lastSync,
    pending: state.pending,
  }
}
