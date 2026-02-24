// Release gates: npm run test | npm run test --workspace=@luxselle/server | npm run typecheck | npm run build
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

export default defineConfig({
  root,
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['packages/server/src/**/*.{test,spec}.ts', 'src/lib/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    testTimeout: 10000,
  },
})
