import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// base './' keeps asset URLs relative, so the same build works at the
// GitHub Pages project path (/endgame-trainer/) and anywhere else.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
