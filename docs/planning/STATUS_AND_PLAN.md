# Luxselle Supplier Engine — Current Status

**Last updated**: 2026-02-27  
**Current State**: Supplier Engine scope with dual-mode UX (Overview + Sidecar)

---

## Executive Summary

- Iterations 1-6 are implemented across core product surfaces.
- Scope pivot is complete: Supplier Engine replaces previous tracker framing.
- Next milestone is Sidecar hardening and mode-adaptive UX polish.
- GSD framework is installed for spec-driven planning and execution.

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

### Phase 7: In Progress

- Sidecar compact UX: QuickCheck, SidecarView, and narrow-width behaviour for Evaluator, Inventory, Invoices.
- Mode-adaptive responsiveness and affordance checks.
- QA sweeps focused on decision speed and reliability in compact layout.

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

1. Complete sidecar usability refinements for compact layouts.
2. Run Quality Lead QA pass with sidecar-focused checks.
3. Validate release gates (`test`, `build`, `typecheck`, optional `test:e2e`).
4. Mark Phase 7 complete once sidecar acceptance criteria are met.
