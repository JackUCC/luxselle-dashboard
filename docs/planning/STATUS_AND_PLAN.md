# Luxselle Supplier Engine — Current Status

**Last updated**: 2026-03-01  
**Current State**: Supplier Engine scope with dual-mode UX (Overview + Sidecar)

---

## Executive Summary

- Iterations 1-6 are implemented across core product surfaces.
- Scope pivot is complete: Supplier Engine replaces previous tracker framing.
- Sidecar hardening implementation for Phase 7 is complete across both planned waves.
- Phase 8 (Jobs + Activity visibility) is complete and committed.
- Phase 9 (Unified Sourcing Intelligence + Frontend Polish) is complete and committed.
- GSD framework is installed for spec-driven planning and execution.
- GSD planning baseline is now present in `.planning/` (`PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, and Phase 7 context).
- Unified `/evaluate` route now combines price check, optional serial context, and landed-cost support.
- Legacy `/buy-box` and `/serial-check` routes now redirect to unified flow.

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

### Phase 7-9: Complete

- Sidecar compact UX hardened for QuickCheck, SidecarView, Evaluator, Inventory, and Invoices.
- Jobs and activity visibility wiring landed in app routing + dashboard feed.
- Unified intelligence page delivered at `/evaluate` with route migration from `/buy-box` and `/serial-check`.
- Targeted regression suites pass for unified flow and sidecar parity:
  - `npm run test:e2e -- evaluator.spec.ts dashboard-shell.spec.ts sidecar-flow.spec.ts`

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

1. Execute Phase 10 Plan 01 (`.planning/phases/10-ai-reliability-provider-diagnostics/10-01-PLAN.md`) for backend provider-unavailable reliability fixes.
2. Execute Phase 10 Plan 02 (`.planning/phases/10-ai-reliability-provider-diagnostics/10-02-PLAN.md`) for frontend provider-unavailable UX states.
3. Continue v3 planning stream with Phase 11 and 12 plan artifacts already drafted under `.planning/phases/11-*` and `.planning/phases/12-*`.
4. Run a release-readiness QA sweep across unified `/evaluate` plus operations pages before next deployment.
