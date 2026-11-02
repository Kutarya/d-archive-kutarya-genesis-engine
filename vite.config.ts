import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.GENESIS_BASE || './',
  build: { target: 'es2022', chunkSizeWarningLimit: 800 },
})
