# QA Run Findings

**Date:** 2025-02-15  
**Scope:** Full QA baseline + E2E per [QA_SWARM_PLAYBOOK.md](QA_SWARM_PLAYBOOK.md).

## Readiness verdict

**Not ready** for release until E2E runs reliably in this environment (or E2E is run in CI with a pre-started app).

Baseline (server tests, typecheck, build) is **green**.

---

## Summary

| Check | Result |
|-------|--------|
| Server unit tests (`npm run test --workspace=@luxselle/server`) | Pass (44 tests) |
| Root unit tests (`npm run test`) | Pass (44 tests) |
| Typecheck (`tsc --noEmit`) | Pass |
| Frontend build (`npm run build`) | Pass |
| E2E (`npm run test:e2e`) | Flaky: 1/15 passed; 14 failed with `ERR_CONNECTION_REFUSED` |

---

## Blockers

1. **E2E dev server timing**  
   Playwright’s `webServer` runs `npm run dev` (emulators + API + Vite). Tests often start before http://localhost:5173 is ready, causing `net::ERR_CONNECTION_REFUSED`. In one run, a single test passed after the server came up; the rest failed.

---

## Fixes applied this run

- **Playwright config load**  
  `config/playwright.config.ts` used `import.meta.url` and `fileURLToPath`, which broke when Playwright loaded the file as CJS (`ReferenceError: exports is not defined`). Replaced with `process.cwd()` for the project root so the config loads in both ESM and CJS.
- **Playwright webServer timeout**  
  Increased from 120s to 180s to give `npm run dev` more time to bring up the client.
- **Typecheck script**  
  Added `npm run typecheck` to root `package.json` and documented it in the QA playbook.

---

## High-priority risks

- **E2E not run in CI**  
  If CI runs `npm run test:e2e` without a pre-warmed dev server, the same connection-refused flakiness will occur.
- **Vite CJS deprecation**  
  Build logs: “The CJS build of Vite's Node API is deprecated.” Plan a move to the ESM API when convenient.

---

## Improvement backlog

1. **E2E reliability**  
   - Prefer starting dev + emulators in a separate process/step, then run `npm run test:e2e` with `reuseExistingServer: true`, or  
   - Run e2e with `--workers=1` and a longer webServer timeout so the server is ready before any test runs.
2. **Playbook**  
   Document in the playbook: “For reliable E2E, start `npm run dev` (and ensure Firebase emulators are running) in another terminal, then run `npm run test:e2e`.”
3. **Vite**  
   Address CJS deprecation in the build pipeline when updating Vite.

---

## Owner input needed

- None for this QA run.  
- For production/e2e: ensure Firebase emulator (or real project) and env (e.g. Gmail OAuth, pricing API keys) are configured per [PRODUCTION_INPUTS_SUPPLIER_EMAIL_AND_PRICING.md](../deploy/PRODUCTION_INPUTS_SUPPLIER_EMAIL_AND_PRICING.md) and [GMAIL_WORKSPACE_OAUTH_SETUP.md](../deploy/GMAIL_WORKSPACE_OAUTH_SETUP.md).
