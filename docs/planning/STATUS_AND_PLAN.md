# Luxselle Supplier Engine — Current Status

**Last updated**: 2026-03-02  
**Current State**: Supplier Engine scope with dual-mode UX (Overview + Sidecar), UI polish + hardening complete

---

## Executive Summary

- Iterations 1-9 are implemented across core product surfaces.
- UI polish milestone (Polish-1 through Polish-4) is complete.
- Sprint 4/5 hardening is complete:
  - shared UI primitives extracted and adopted,
  - oversized page splits delivered,
  - critical product multi-write routes moved to atomic batch commits,
  - dashboard/status query paths bounded to reduce unbounded scans.
- Validation evidence captured:
  - `npm run typecheck` (pass),
  - `npm run test` (pass, 39 files / 230 tests),
  - targeted e2e suites for touched flows (pass).
- Full `npm run test:e2e` currently hangs during pretest browser setup in this environment and is tracked as follow-up.

---

## Product Scope (Current)

### Kept

1. Price Check / Evaluator
2. Inventory awareness and stock context
3. Sourcing pipeline workflows
4. Invoicing as operational output
5. Jobs and import observability

### Removed from active product surface

1. Procurement queue pages/routes
2. Supplier-feed pages/routes

---

## Implementation Status by Phase

### Phase 1-9: Complete

- Workspace, shared schemas, repositories, and emulator flow are stable.
- Core backend routes for products, pricing, sourcing, jobs, invoices, dashboard are active.
- Frontend pages for dashboard, inventory, evaluate/unified intelligence, sourcing, jobs, invoices are active.
- Sidecar mode parity and route continuity are in place.
- Unified `/evaluate` route is canonical, with `/buy-box` and `/serial-check` redirects.

### Sprint 4/5 Hardening: Complete

- Shared primitives: `IconButton`, `TableShell`, `FilterChipGroup`.
- Page decomposition: Inventory row actions, market-research freshness badge, unified-intelligence diagnostics/data-source blocks extracted.
- Backend reliability:
  - `POST /api/products/:id/transactions` now performs multi-write operations in one Firestore batch.
  - `POST /api/products/:id/sell-with-invoice` now commits transaction/product/invoice/activity atomically in one batch.
- Backend query performance:
  - bounded repo-query support in `BaseRepo`,
  - dashboard endpoints now use bounded repo methods (`kpis`, `activity`, `status`, `profit-summary`),
  - supplier email sync status now reads recent jobs via bounded query path.

---

## Active Endpoint Domains

- `GET /api/dashboard/*` for KPIs, status, activity context (bounded query paths in place)
- `POST /api/pricing/*` for evaluator analysis
- `GET|POST|PUT /api/products/*` for inventory and transactions (atomic multi-write protection for critical sell flows)
- `GET|POST|PUT|DELETE /api/sourcing/*` with transition validation
- `GET|POST /api/jobs/*` for operational visibility and retry
- `GET|POST /api/invoices/*` for invoice workflows
- Others: `/api/suppliers/*`, `/api/settings/*`, `/api/market-research/*`, `/api/vat/*`, `/api/ai/*`, `/api/fx/*`, `/api/search/*`

---

## Next Actions

1. Execute deferred Phase 10 (`.planning/phases/10-ai-reliability-provider-diagnostics/10-01-PLAN.md` and `10-02-PLAN.md`) for provider-unavailable reliability and UI guidance.
2. Resolve environment-level full e2e pretest hang (`npm run test:e2e`) and capture a full-matrix pass artifact.
3. Continue deferred v3 planning stream (Phases 11 and 12) for agentic intelligence, ML upgrades, and end-to-end operational verification.
