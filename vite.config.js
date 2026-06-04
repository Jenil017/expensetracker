import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev the React app runs on :5173 and the Express API on :3000.
// Proxy /api and /healthz to the server so the browser sees a single origin
// (matches production, where Express serves both the app and the API).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/healthz': 'http://localhost:3000',
    },
  },
  build: { outDir: 'dist' },
})
