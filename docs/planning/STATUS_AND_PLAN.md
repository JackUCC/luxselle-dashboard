# Luxselle Supplier Engine — Current Status

**Last updated**: 2026-02-28  
**Current State**: Supplier Engine scope with dual-mode UX (Overview + Sidecar)

---

## Executive Summary

- Iterations 1-6 are implemented across core product surfaces.
- Scope pivot is complete: Supplier Engine replaces previous tracker framing.
- Sidecar hardening implementation for Phase 7 is complete across both planned waves.
- GSD framework is installed for spec-driven planning and execution.
- GSD planning baseline is now present in `.planning/` (`PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, and Phase 7 context).
- Phase 7 execution summaries are complete (`07-01-SUMMARY.md`, `07-02-SUMMARY.md` pending verification/UAT closeout commit).
- Pre-existing evaluator E2E nav-routing failure was fixed and now passes in targeted regression runs.

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

### Phase 1-6: Complete

- Workspace, shared schemas, repositories, and emulator flow are stable.
- Core backend routes for products, pricing, sourcing, jobs, invoices, dashboard are active.
- Frontend pages for dashboard, inventory, buy-box, sourcing, jobs, invoices are active.
- Error handling, status validation, and baseline QA workflows are in place.

### Phase 7: Execution Complete, Verification In Progress

- Sidecar compact UX hardened for QuickCheck, SidecarView, Evaluator, Inventory, and Invoices.
- Mode-switch context retention implemented (exit removes `mode` while preserving route/query intent).
- Sidecar journey E2E added (`tests/e2e/sidecar-flow.spec.ts`), plus parity checks in evaluator/inventory/invoices suites.
- Targeted E2E gate pass confirmed:
  - `npm run test:e2e -- tests/e2e/sidecar-flow.spec.ts`
  - `npm run test:e2e -- tests/e2e/evaluator.spec.ts tests/e2e/inventory.spec.ts tests/e2e/invoices.spec.ts`

---

## Current Architecture Snapshot

```text
luxselle-dashboard/
├── src/
│   ├── LuxselleApp.tsx                # Overview/Sidecar routing shell
│   ├── lib/LayoutModeContext.tsx      # mode=overview|sidecar
│   ├── components/
│   │   └── sidecar/                   # SidecarView.tsx, QuickCheck.tsx, BatchProcessor.tsx, SidecarWidgets.tsx, widgets/
│   └── pages/
│       ├── BuyBox/
│       ├── Inventory/
│       ├── Sourcing/
│       ├── Jobs/
│       ├── Invoices/
│       ├── MarketResearch/
│       ├── RetailPrice/
│       └── SerialCheck/
├── packages/server/src/
│   ├── routes/                        # dashboard, pricing, products, sourcing, jobs, invoices, etc.
│   ├── middleware/                    # auth, request-id, error handling
│   └── services/                      # pricing, price-check, import pipelines
└── .claude/ + .cursor/                # GSD + Cursor agent framework assets
```

---

## Active Endpoint Domains

- `GET /api/dashboard/*` for KPIs, status, activity context
- `POST /api/pricing/*` for evaluator analysis
- `GET|POST|PUT /api/products/*` for inventory and transactions
- `GET|POST|PUT|DELETE /api/sourcing/*` with transition validation
- `GET|POST /api/jobs/*` for operational visibility and retry
- `GET|POST /api/invoices/*` for invoice workflows
- Others: `/api/suppliers/*`, `/api/settings/*`, `/api/market-research/*`, `/api/vat/*`, `/api/ai/*`, `/api/fx/*`, `/api/search/*` (see CODE_REFERENCE for full index)

---

## Next Actions

1. Run Phase 7 goal verification and finalize `07-VERIFICATION.md`.
2. Run conversational UAT via `/gsd:verify-work 7` and persist outcomes in `07-UAT.md`.
3. Close Phase 7 in roadmap/state/requirements after verification + UAT completion.
4. Trigger Quality Lead QA swarm for release signoff packaging.
