# Release Readiness Report — Luxselle Supplier Engine

**Date:** 2026-02-26  
**Branch:** current  
**Quality Lead:** agent-quality-lead  
**Playbook:** docs/planning/QA_SWARM_PLAYBOOK.md

---

## 1. Verdict

**Ready** — with conditions. All automated quality gates pass; remaining items are operational configuration and optional improvements, not code blockers.

---

## 2. Baseline Command Results

| Command | Result | Notes |
|--------|--------|-------|
| `npm test` | **PASS** | 24 test files, 121 tests, ~13s |
| `npm run build` | **PASS** | Vite production build, 21.4s (CJS deprecation warning only) |
| `npm run typecheck` | **PASS** | `tsc --noEmit` clean |

E2E was not run (requires `npm run dev` + `npm run test:e2e` in separate terminals per playbook).

---

## 3. API Contracts

### Standard error shape `{ error: { code, message, details? } }`

- **packages/server/src/lib/errors.ts**: Defines `formatApiError`, `ApiError`, `API_ERROR_CODES`.
- **packages/server/src/server.ts**: Global error handler returns this shape for:
  - Body parse (400), upload limit (400), `ApiError` (err.status), Zod (400), unhandled (500).
- Route-level tests (dashboard, sourcing, settings, jobs, invoices, products, vat, suppliers, market-research, search) assert error handler shape in their mounted app.
- **Conclusion:** Consistent; async route errors that call `next(error)` reach the handler and get the standard shape.

### PUT /api/sourcing/:id — status transitions

- **packages/server/src/routes/sourcing.ts**: Uses `isValidSourcingTransition` / `getValidNextStatuses` from `packages/server/src/lib/sourcingStatus.ts`. Invalid transition → 400 with `formatApiError(BAD_REQUEST, ..., { from, to, allowedNextStatuses })`.
- **packages/server/src/routes/sourcing.test.ts**: Covers valid transition (open→sourcing), invalid (open→fulfilled), same-status (open→open); asserts `error.code`, `error.message`, `error.details`.
- **packages/shared**: `SourcingStatusSchema` in `base.ts`; used by `SourcingRequestSchema` and server `sourcingStatus` (open → sourcing → sourced → fulfilled|lost).
- **Conclusion:** Implemented and tested; shared and server are aligned.

---

## 4. Frontend Flows

### Dashboard, Inventory, Evaluator (Buy Box), Sourcing, Invoices

- **alert():** None found in `src/`; feedback uses `react-hot-toast` (and `Toaster` in `LuxselleApp.tsx`).
- **Loading states:** Present on Dashboard, Inventory, Jobs, Sourcing, Invoices, SerialCheck, RetailPrice, MarketResearch, ProductDetailDrawer (including loading copy e.g. “Loading inventory...”, “Loading requests...”).
- **Empty states:** Inventory (no products), Jobs (no jobs), Invoices (no invoices + CTA), Sourcing (filtered empty), Evaluator (no similar items), ProductDetailDrawer (no images, no transactions).
- **Mode-adaptive layout:** `useLayoutMode()` from `src/lib/LayoutModeContext.tsx` used in:
  - **Dashboard:** `DashboardView.tsx` — when `isSidecar` returns `<SidecarView />` (QuickCheck).
  - **Evaluator:** `EvaluatorView.tsx` — when `isSidecar` returns `<SidecarView initialTab="quick" />`.
  - **LuxselleApp.tsx**: Sidecar shows `SidecarNav`; Overview shows main nav.
- **Buy Box:** Image upload → `/pricing/analyze-image`; text path → `/pricing/price-check`. IE-first behaviour is policy (e.g. `ie_first_eu_fallback`) and allowlist; documented in `docs/deploy/PRODUCTION_INPUTS_SUPPLIER_EMAIL_AND_PRICING.md`; not asserted in frontend tests.

**Conclusion:** No alert() in scope; loading and empty states and mode-adaptive layout are in place for the reviewed pages.

---

## 5. Test Coverage

### Test files (24 total, 121 tests)

- **Server routes:** dashboard.test.ts, sourcing.test.ts, jobs.test.ts, settings.test.ts, vat.test.ts, invoices.test.ts, products.test.ts, market-research.test.ts, suppliers.test.ts, search.test.ts, ai.serial-decode.test.ts.
- **Server libs:** sourcingStatus.test.ts, fx.test.ts, vat.test.ts, csvProductParser.test.ts.
- **Server services:** PricingService.test.ts, SupplierEmailSyncService.test.ts, SupplierImportService.test.ts, SupplierImportService.template.test.ts.
- **Shared:** schemas.test.ts.
- **Frontend:** api.test.ts, landedCost.test.ts, serialDateDecoder.test.ts, serialValuation.test.ts.

### Gaps (non-blocking)

- **packages/server/src/routes/fx.ts**: No route test (GET /api/fx). Logic is thin (calls FX service); covered indirectly by FX usage in pricing. **Risk: Low.**
- **packages/server/src/routes/pricing.ts**: No dedicated route test file; pricing logic covered by `PricingService.test.ts`. **Risk: Low–Medium** (route contract/validation not asserted).
- **ai.ts**: Only `ai.serial-decode.test.ts`; other POST endpoints (generate-description, insights, prompt, retail-lookup) not covered by route tests. **Risk: Low** for release if those flows are secondary.

---

## 6. Blockers

**None.** All playbook automated gates pass; no code issues found that must be fixed before release.

---

## 7. High-Priority Risks

1. **Supplier email sync path** — Operational. Requires Gmail OAuth, `SUPPLIER_EMAIL_ENABLED`, mailbox and mapping inputs per `docs/deploy/PRODUCTION_INPUTS_SUPPLIER_EMAIL_AND_PRICING.md`. Not a code blocker; owner must configure.
2. **Buy Box IE-first behaviour** — Policy/allowlist and env (e.g. `pricingIeSourceAllowlist`, `ie_first_eu_fallback`) must be verified in production; doc exists.
3. **Landed-cost / decision persistence** — Flow from evaluation to sourcing/inventory is implemented (toasts, APIs); no automated E2E was run this cycle. Recommend one manual pass or E2E run before release.

---

## 8. Improvement Backlog (prioritized)

1. Add **route-level test for GET /api/fx** (packages/server/src/routes/fx.test.ts) to lock contract and error shape.
2. Add **pricing route tests** (e.g. pricing.test.ts) for POST /analyse, /price-check, /analyze-image validation and error responses.
3. Run **E2E** after `npm run dev` and document pass/fail in next readiness run.
4. **Docs:** Have agent-docs-improvement confirm `docs/deploy/*` (Vercel, Railway, production setup, runbooks) match current scripts and env.
5. Optional: Add **empty-state copy** for Dashboard when KPIs are zero (e.g. “No inventory yet”) if product wants it.
6. Optional: **AI route tests** for generate-description, insights, prompt, retail-lookup for validation and error shape.

---

## 9. Missing Owner Inputs

From `docs/deploy/PRODUCTION_INPUTS_SUPPLIER_EMAIL_AND_PRICING.md` and playbook gates:

- **Supplier email sync:** Gmail OAuth credentials, shared mailbox, `SUPPLIER_EMAIL_ENABLED=true`, optional query and attachment limits.
- **Supplier mapping:** Per-supplier sender aliases, sample files, column mappings, availability normalization.
- **IE pricing:** Final IE allowlist, confirmation of `ie_first_eu_fallback`, any excluded sources.
- **Auction landed-cost:** Per-platform profile (fees, shipping, duty, VAT).
- **Tax/finance:** Any remaining defaults for production.

These are configuration/data inputs, not code defects; release can ship once code gates pass and deployment docs are followed.

---

## 10. Summary

- **Verdict:** Ready (with operational and doc follow-ups).
- **Blockers:** None.
- **High risks:** Supplier email config, IE-first verification, E2E not run this cycle.
- **Backlog:** Fx + pricing route tests, E2E run, docs sync, optional Dashboard empty state and AI route tests.
- **Owner inputs:** Gmail/supplier mapping, IE allowlist, auction profiles, tax defaults — as in PRODUCTION_INPUTS doc.
