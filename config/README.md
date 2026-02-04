# Config

Build and test tool configuration. Run from repo root; scripts in root `package.json` point here.

| File | Purpose |
|------|---------|
| **vite.config.ts** | Vite (frontend dev/build). Alias `@shared`, proxy `/api` to backend. |
| **vitest.config.ts** | Vitest unit tests (server source in `packages/server/src`). |
| **playwright.config.ts** | Playwright E2E tests (specs in `tests/e2e`). |

Frontend TypeScript and Tailwind/PostCSS configs remain at repo root (`tsconfig.json`, `tailwind.config.js`, `postcss.config.js`) so tools that don’t support a config path still find them.
