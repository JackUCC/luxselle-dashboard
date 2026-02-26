# Current State of the Code — Luxselle Supplier Engine

**Date:** 2026-02-26  
**Scope:** Full evaluation via static analysis, Quality Lead release readiness, and Codebase Optimizer cleanup audit.  
**References:** [RELEASE_READINESS_REPORT.md](planning/RELEASE_READINESS_REPORT.md), [CLEANUP_OPTIMIZATION_REPORT.md](CLEANUP_OPTIMIZATION_REPORT.md)

---

## 1. Health Score

| Check | Result | Notes |
|-------|--------|--------|
| **TypeScript** | Pass | `npm run typecheck` — no errors |
| **Linter** | Pass | No linter errors in `src/`, `packages/server/src/`, `packages/shared/src/` |
| **Unit tests** | Pass | 24 test files, 121 tests (Vitest) |
| **Build** | Pass | Vite production build succeeds (CJS deprecation warning only) |
| **E2E** | Not run | Requires `npm run dev` in one terminal and `npm run test:e2e` in another per [QA_SWARM_PLAYBOOK.md](planning/QA_SWARM_PLAYBOOK.md) |

**Overall:** Codebase is in good health. No blockers for release from automated gates. No dedicated `lint` script in root `package.json` (only typecheck and tests).

---

## 2. Feature Status

| Area | Status | Notes |
|------|--------|--------|
| **Dashboard** | Working | KPIs, activity feed; loading and empty handling; Sidecar switches to QuickCheck |
| **Inventory** | Working | List, drawer, transactions; loading/empty states; mode-adaptive |
| **Evaluator (Buy Box)** | Working | Image/text price check, market research; Sidecar shows SidecarView |
| **Sourcing** | Working | Status flow (open→sourcing→sourced→fulfilled|lost); validated on PUT; loading/empty |
| **Jobs** | Working | System jobs list; loading/empty |
| **Invoices** | Working | List, creation, PDF; loading/empty and CTA |
| **Serial Check / Retail Price** | Working | Decode and price-check flows; loading copy |
| **Sidecar mode** | Working | `useLayoutMode()`, SidecarNav, QuickCheck; Overview vs Sidecar layouts |

**Broken:** None identified.  
**Missing (optional):** Dashboard empty state when KPIs are zero (e.g. “No inventory yet”) — product decision.

---

## 3. Usability

- **Feedback:** No `alert()` in `src/`; feedback uses `react-hot-toast` and `Toaster` in `LuxselleApp.tsx`.
- **Loading states:** Present on Dashboard, Inventory, Jobs, Sourcing, Invoices, SerialCheck, RetailPrice, MarketResearch, ProductDetailDrawer (with copy like “Loading inventory...”, “Loading requests...”).
- **Empty states:** Handled for Inventory, Jobs, Invoices, Sourcing (filtered), Evaluator (no similar items), ProductDetailDrawer (images, transactions).
- **Mode-adaptive layout:** `useLayoutMode()` used in Dashboard and Evaluator to show SidecarView when `isSidecar`; LuxselleApp switches nav; Overview vs Sidecar behaviour implemented.
- **Copy consistency:** Minor inconsistency (“Loading...” vs “Loading…”, “Analyzing...” vs “Analyzing…”); see Cleanup section.

---

## 4. Cleanup Recommendations

Prioritized list; details and file paths in [CLEANUP_OPTIMIZATION_REPORT.md](CLEANUP_OPTIMIZATION_REPORT.md).

| Priority | Area | Action |
|----------|------|--------|
| **P0** | Dead code | Remove or archive `BuyingListItemRepo` (and buying-list schema) if buying-list is out of scope; update ARCHITECTURE, CODE_REFERENCE, PROJECT_STRUCTURE, ITERATION_5_EVIDENCE_PACK. |
| **P1** | API consistency | Use `apiGet('/fx')` in `CalculatorWidget` and `apiGet('/dashboard/status')` in `ServerStatusContext` instead of raw `fetch`. |
| **P1** | Error contract | In `packages/server/src/routes/search.test.ts`, make the test error middleware return full `{ error: { code, message, details? } }` (e.g. via `formatApiError`). |
| **P2** | Types | Replace `any` in `AiService` and `MarketResearchService`; consider shared types for Market Research. |
| **P2** | DRY | Single route list in `LuxselleApp.tsx`; shared loading/empty component or hook; shared serial-decode/price-check logic for widgets and Serial Check. |
| **P2** | Copy | Standardize “Loading…” / “Analyzing…” across the app (e.g. in a shared loading component). |
| **P2** | Dependencies | Remove `pdfmake` and `firebase-admin` from root `package.json` (used only by `packages/server`). |

---

## 5. What to Fix Next (Prioritized)

1. **If buying-list is abandoned:** Remove or archive `BuyingListItemRepo`, optional schema cleanup, and update docs (P0).
2. **Consistency and contract:** Refactor CalculatorWidget and ServerStatusContext to `apiGet`; fix search.test.ts error shape (P1).
3. **Tests:** Add route test for GET `/api/fx`; add pricing route tests for POST analyse/price-check/analyze-image; run E2E with dev stack and record result (see Improvement Backlog in Release Readiness Report).
4. **Docs:** Have agent-docs-improvement confirm `docs/deploy/*` matches current scripts and env.
5. **Optional:** Shared loading/empty component, single route list, shared serial-check flow, standardize copy, remove root deps (P2).

---

## 6. High-Priority Risks (No Code Blockers)

1. **Supplier email sync** — Operational config (Gmail OAuth, `SUPPLIER_EMAIL_ENABLED`, mailbox/mapping). See `docs/deploy/PRODUCTION_INPUTS_SUPPLIER_EMAIL_AND_PRICING.md`.
2. **Buy Box IE-first** — Policy/allowlist and env (`pricingIeSourceAllowlist`, `ie_first_eu_fallback`) to be verified in production.
3. **E2E** — Not run this cycle; recommend one manual pass or E2E run before release.

---

## 7. Summary

- **Verdict:** Ready for release from a code perspective, with operational and doc follow-ups.
- **Blockers:** None.
- **Health:** Typecheck, linter, 121 unit tests, and build all pass.
- **Features:** Dashboard, Inventory, Evaluator, Sourcing, Jobs, Invoices, Sidecar/Overview all working with loading and empty states and toast feedback.
- **Cleanup:** P0 (buying-list dead code), P1 (apiGet + search test error shape), P2 (DRY, types, copy, deps) as above.

For full detail on release readiness and missing owner inputs, see [RELEASE_READINESS_REPORT.md](planning/RELEASE_READINESS_REPORT.md). For file-level cleanup and validation checklist, see [CLEANUP_OPTIMIZATION_REPORT.md](CLEANUP_OPTIMIZATION_REPORT.md).
