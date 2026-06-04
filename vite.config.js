import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Static SPA — data + auth come from Firebase directly in the browser, so no API proxy.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: 'dist' },
})
