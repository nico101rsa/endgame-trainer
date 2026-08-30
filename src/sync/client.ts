// Supabase client (spec §11). The anon key + URL come from .env
// (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) — safe in a static build
// because Row Level Security restricts every row to its owner.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const syncConfigured = Boolean(url && anonKey)

// PKCE flow: the magic-link callback returns as a ?code= query parameter.
// The default implicit flow puts tokens in the URL fragment, which this
// app's HashRouter would rewrite before supabase-js could parse them.
export const supabase: SupabaseClient | null = syncConfigured
  ? createClient(url!, anonKey!, { auth: { flowType: 'pkce' } })
  : null
