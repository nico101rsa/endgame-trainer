import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSync } from './sync/engine.ts'

// No-op unless VITE_SUPABASE_* env vars are set (spec §11 local-first).
initSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
