import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev: client runs on 5173, sync server on 4321.
// Prod: the sync server serves the built client, so everything is same-origin.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
})
