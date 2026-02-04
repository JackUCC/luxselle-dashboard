# Tests

All automated tests live under this folder.

| Folder | Purpose |
|--------|---------|
| **e2e/** | Playwright end-to-end tests (browser). Run from root: `npm run test:e2e`. |

Unit tests for the API server stay next to source in `packages/server/src/` (e.g. `fx.test.ts`). Run from root: `npm run test`.

For E2E, start the app first (`npm run dev`), then in another terminal run `npm run test:e2e` (or use Playwright’s webServer in `playwright.config.ts` if emulators/backend are up).
