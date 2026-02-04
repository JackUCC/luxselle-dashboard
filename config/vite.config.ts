/**
 * Vite config: React plugin, @shared alias, proxy /api to backend (3001).
 * @see docs/CODE_REFERENCE.md
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

export default defineConfig({
  root,
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(root, 'packages/shared/src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
