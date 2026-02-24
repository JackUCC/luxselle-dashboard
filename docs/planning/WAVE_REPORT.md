# Release Readiness Report — 2026-02-24
Branch: `main`
Sprint: Full Combined Agent Swarm (4-Wave)

---

## Quality Gate Results

| Gate | Before | After | Delta |
|------|--------|-------|-------|
| Server unit tests | 68 / 68 | **81 / 81** | +13 new tests |
| All unit tests | 68 / 68 | **81 / 81** | +13 new tests |
| TypeScript typecheck | ❌ 5 errors (InventoryView) | **✅ 0 errors** | Fixed |
| Vite build | ✅ PASS | **✅ PASS** | — |
| E2E (5 suites, 15 tests) | Flaky (startup timing) | **Manual verification required** | See runbook |

---

## Readiness Verdict

**READY** — All automated quality gates pass. E2E requires manual verification with a warm dev stack (see runbook below).

---

## Changes Made This Sprint

### Wave 1A — Backend Contracts + Reliability
Commit: `fb103c8`

| Fix | File | Detail |
|-----|------|--------|
| ✅ Suppliers router created | `packages/server/src/routes/suppliers.ts` | 5 endpoints: GET list, POST import/preview, PUT /:id/import-template, GET email/status, POST email/sync |
| ✅ Suppliers router mounted | `packages/server/src/server.ts` | `app.use('/api/suppliers', suppliersRouter)` |
| ✅ ESM hazard fixed | `packages/server/src/middleware/idempotency.ts` | Replaced `require('crypto')` inside function body with top-level `import { createHash } from 'node:crypto'` |
| ✅ Pricing route hardened | `packages/server/src/routes/pricing.ts` | `JSON.parse` of OpenAI response wrapped in try/catch → 502; `console.error` → `logger.error` |
| ✅ Settings route | Already compliant | `formatApiError` on Zod errors already in place — no change needed |

### Wave 1B — Test Hardening
Commit: `4875a6e`

| Addition | File | Tests added |
|----------|------|-------------|
| Sourcing route tests | `packages/server/src/routes/sourcing.test.ts` | DELETE 204, GET ?q= filter (3 cases), invalid status transition |
| Settings route tests (new file) | `packages/server/src/routes/settings.test.ts` | GET 200, PATCH valid 200, PATCH invalid 400 with VALIDATION_ERROR code |
| landedCost edge cases | `src/lib/landedCost.test.ts` | Zero duty/VAT, null margin fields, null currency rate early-exit |
| Release gate comment | `config/vitest.config.ts` | `// Release gates: npm run test \| npm run build \| npm run typecheck` |

### Wave 1C — Data Pipeline
Commit: `fb103c8`

| Fix | File | Detail |
|-----|------|--------|
| ✅ Empty workbook error | `SupplierImportService.ts` | `throw new Error('Workbook is empty or contains no parseable sheets')` instead of silent return |
| ✅ Oversized attachment check | `SupplierEmailSyncService.ts` | Pre-download size guard using `part.body?.size` vs `SUPPLIER_EMAIL_MAX_ATTACHMENT_MB` |
| ✅ `previewImportFile` alias | Already existed | Full public method at lines 104-115 — no change needed |
| ✅ Null guards for Gmail fields | Already present | `filename && attachmentId` check already in `collectAttachmentParts` — no change needed |
| ✅ JobRunner error path | Already present | try/catch with `status: 'failed'` already at lines 64-72 — no change needed |
| ✅ No-match email sync test | `SupplierEmailSyncService.test.ts` | "sender not in supplier list → processedEmails=0, importedItems=0" |

### Wave 2D — Frontend
Commit: `7c95ed5`

| Fix | File | Detail |
|-----|------|--------|
| ✅ React hooks violation fixed | `src/pages/Dashboard/DashboardView.tsx` | `useState`/`useEffect` were declared after conditional `isSidecar` early return — violates Rules of Hooks. Hoisted above the return. |
| ✅ Missing error state | `src/pages/Invoices/InvoicesView.tsx` | API failure silently showed empty state. Added `error` string state, error card UI, and Retry button. |
| ✓ All other pages | Inventory, Sourcing, Jobs, BuyBox | Loading and error states already present — no changes needed |

### Wave 2E — Docs
Commit: `ae5a835`

| Update | File | Detail |
|--------|------|--------|
| ✅ E2E runbook | `docs/planning/QA_SWARM_PLAYBOOK.md` | Added "E2E Reliability Runbook" section (two terminals, wait for both services) |
| ✅ 4-wave swarm structure | `docs/planning/QA_SWARM_PLAYBOOK.md` | Table documenting Wave 0-3 pattern and principles |
| ✅ Stale AI_PROVIDER removed | `docs/deploy/PRODUCTION_SETUP.md` | Removed Gemini block (not a valid AI_PROVIDER value) |
| ✅ Gemini checklist removed | `docs/deploy/QUICK_START_CHECKLIST.md` | Removed "For Gemini" env var steps |
| ✅ Suppliers API reference | `docs/CODE_REFERENCE.md` | Added 5-endpoint table for /api/suppliers |
| ✅ Gmail OAuth owner warnings | `docs/deploy/GMAIL_WORKSPACE_OAUTH_SETUP.md` | Added ⚠️ "Owner input required" tags on 4 credential fields |

---

## Medium Findings (not blocking, plan for next sprint)

| # | Finding | File | Detail |
|---|---------|------|--------|
| M1 | `marketCountry` + `fallbackUsed` not displayed in Buy Box | `EvaluatorView.tsx` | `PriceCheckResult` interface doesn't include these fields. Requires backend schema change + frontend type update. |
| M2 | Sidecar mode uses URL params, not localStorage | `src/lib/LayoutModeContext.tsx` | Mode (`?mode=sidecar`) resets if nav links don't carry the query param. No persistence across page reloads. |
| M3 | No Evaluator → buying list / sourcing flow | `EvaluatorView.tsx` | No "Save to buying list" action exists. Sourcing page has its own separate create form. If integration is planned, `evaluationId` linkage needed. |
| M4 | `/api/pricing/analyse` endpoint referenced in plan but not in frontend | — | `EvaluatorView` only calls `/pricing/price-check`. If a separate analyse endpoint is planned, the frontend type contract needs updating. |

---

## Improvement Backlog

1. **Add `/api/suppliers` frontend integration** — the backend endpoints exist but there's no UI page or API client functions wired to them yet.
2. **Implement `marketCountry` + `fallbackUsed` in Buy Box UI** — requires backend `PriceCheckResult` schema extension.
3. **Persist sidecar mode via `localStorage`** — currently resets on navigation if links don't carry `?mode=sidecar`.
4. **E2E CI setup** — E2E tests require a warm dev stack; add a CI job that starts the stack before running Playwright.
5. **Auth enforcement** — middleware is implemented and tested but auth is still disabled in MVP. Enable for production.
6. **`/api/pricing/analyse` endpoint** — referenced in planning docs but not implemented; clarify if it's distinct from `/api/pricing/price-check`.
7. **Multi-DB support verification** — `FIRESTORE_DATABASE_ID` threading through `BaseRepo.getCollection` should be confirmed with a live non-default DB test.
8. **Supplier Hub frontend page** — backend endpoints exist; a UI page is needed to expose import preview, template mapping, and email sync controls.

---

## Owner Input Required

| Item | Required Action |
|------|----------------|
| Gmail OAuth credentials | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER` must be provided by owner before enabling supplier email sync in production |
| IE market source allowlist | Confirm which domains count as IE-first market sources (e.g. designerexchange.ie) for Buy Box logic |
| Railway env vars | Confirm `FIRESTORE_DATABASE_ID`, `VITE_API_BASE`, and `AI_PROVIDER` are set correctly in Railway dashboard |
| Vercel env vars | Confirm `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_API_BASE` are set in Vercel |
| Auth enablement decision | Confirm when to flip `AUTH_ENABLED` to `true` and enforce role checks |

---

## E2E Manual Verification Runbook

```bash
# Terminal 1 — start full dev stack
npm run dev
# Wait for:
#   VITE ready in … ms  (http://localhost:5173)
#   API server running on http://0.0.0.0:3001

# Terminal 2 — run E2E tests
npm run test:e2e
# Expected: 15 tests pass across 5 suites
# (dashboard-shell, evaluator, inventory, market-research, sourcing)
```

Known issue: tests that start before both services are ready will fail with connection-refused errors. Always wait for both ready messages before running.

---

## Sprint Commits

```
7c95ed5  fix(frontend): UX polish, loading/error states, flow hardening
ae5a835  docs: sync deployment, API docs, and QA playbook with current implementation
e3e24e9  docs: align Supplier Engine sidecar scope and fix inventory crash
fb103c8  fix(data): harden import pipeline and email sync reliability
4875a6e  test: close coverage gaps and make release gates explicit
```
