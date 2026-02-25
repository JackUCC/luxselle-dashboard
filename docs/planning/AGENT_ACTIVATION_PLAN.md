# Agent Activation Plan — Repository Health Check

## Verification Snapshot (Current Branch)

Date: 2026-02-16

Executed checks:
- `npm run typecheck` ✅
- `npm test` ✅ (44 tests passed)
- `npm run build` ✅

Observed warnings to triage:
- npm warning: `Unknown env config "http-proxy"` (non-blocking; appears in each npm command).
- Vite warning: CJS Node API deprecation from current build path (non-blocking now; should be migrated to ESM usage path).

## Recently Changed Areas (from latest commit history)

### Runtime & Build Configuration
- `package.json`
- `config/playwright.config.cjs`
- `config/playwright.config.ts`
- `.env.example`

### Frontend Shell & Navigation
- `src/LuxselleApp.tsx`
- `src/components/navigation/WideScreenSideRail.tsx`
- `src/lib/placeholder.ts`

### Backend/Pricing Validation
- `packages/server/src/services/pricing/PricingService.test.ts`

### End-to-End Coverage
- `tests/e2e/dashboard-shell.spec.ts`
- `tests/e2e/evaluator.spec.ts`

### Firebase/Security/Infra
- `firebase/firestore.rules`
- `firebase/storage.rules`
- `firebase/firestore.indexes.json`

### Docs & Deployment Runbooks
- `README.md`
- `docs/firebase/FIREBASE_CHECKLIST.md`
- `docs/firebase/FIREBASE_SETUP.md`
- `docs/deploy/PRODUCTION_SETUP.md`
- `docs/deploy/PRODUCTION_TROUBLESHOOTING.md`
- `docs/deploy/RAILWAY_500_INVESTIGATION.md`
- `docs/deploy/RAILWAY_CHECKLIST.md`
- `docs/deploy/VERCEL_CHECKLIST.md`
- `docs/planning/DEPLOYMENT_CHECKER_PLAYBOOK.md`
- `docs/planning/QA_SWARM_PLAYBOOK.md`
- `docs/planning/QA_RUN_FINDINGS.md`
- `docs/planning/CHECKLIST_AFTER_QA_RUN.md`

## Agent Activation Plan (Issue-Focused)

### Phase 1 — Quality Gate (Immediate)
1. **agent-quality-lead**
   - Run release-readiness sweep with current gates (typecheck/test/build/e2e smoke).
   - Confirm no regressions after recent merge and Playwright config changes.
2. **agent-qa-backend-contracts**
   - Validate pricing, sourcing, and supplier import contract behavior against tests.
   - Add/adjust contract tests if API payloads changed without explicit schema tests.
3. **agent-qa-frontend-flows**
   - Verify dashboard/evaluator/inventory core flows and shell navigation behavior.
   - Confirm route-level lazy chunks and load states after nav tweaks.

### Phase 2 — Deployment & Data Safety
4. **agent-qa-data-pipeline**
   - Validate supplier email ingestion, attachment parsing, and job retry paths.
   - Cross-check cron/job status signal visibility and failure handling.
5. **agent-docs-improvement**
   - Reconcile docs with implemented config reality (Playwright CJS, Firebase checklist, deployment runbooks).
   - Add exact command matrix for CI and local QA parity.

### Phase 3 — UX/Product Flow Hardening
6. **agent-dashboard**
   - Audit low-stock/alert KPI interactions and command bar reliability.
7. **agent-evaluator**
   - Verify one-tap decision handoff to sourcing/inventory and error recovery states.
8. **agent-inventory**
   - Validate add/update/stock transitions and invoice handoff signals.
9. **agent-jobs**
   - Confirm retry runner observability and operator feedback loops.
10. **agent-coordinator**
   - Ensure cross-page flow continuity (Evaluator → Inventory → Invoices).

## Prioritized Fix List (if issues are discovered)

### P0 — Must Fix Before Release
- Any failing typecheck/test/build command.
- API contract mismatches for pricing/supplier import.
- Firestore/storage rule regressions that block critical writes/reads.

### P1 — Should Fix in Current Iteration
- Playwright config drift between TS and CJS paths.
- Missing e2e coverage for recently changed navigation and evaluator actions.
- Docs mismatch between runbooks and current deployment/runtime settings.

### P2 — Next Iteration Improvements
- Remove npm `http-proxy` warning source from environment or tooling config.
- Migrate build/runtime usage away from Vite CJS Node API warning path.
- Expand coordinator-level cross-page smoke suite.

## Suggested Execution Order
1. Quality Lead kickoff report
2. Backend Contracts QA + Frontend Flows QA in parallel
3. Data Pipeline QA
4. Docs Improvement updates
5. Page agents (Dashboard/Evaluator/Inventory/Jobs)
6. Coordinator final end-to-end signoff

## Definition of Done
- All quality gate commands pass in local and CI.
- No unresolved P0 items.
- P1 items either fixed or tracked with owners and ETA.
- Docs/checklists reflect actual commands and deployment expectations.
- Coordinator signoff confirms critical cross-page business flow is stable.

## Tools & MCP (local setup)
- **Context7 MCP**: already in Claude local config (`claude mcp add context7 -- npx -y @upstash/context7-mcp@latest`). In Cursor, Context7 is available via the compound-engineering-context7 plugin.
- **Playwright MCP**: added to Claude local config; also enabled for this repo via `.cursor/mcp.json` so Cursor has Playwright in this project. Restart Cursor for project MCP changes to apply.
- **commit-commands plugin**: install with `claude plugins install commit-commands` (Claude CLI). If it hangs, run it in a terminal and wait or retry.
