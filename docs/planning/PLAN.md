# Luxselle Supplier Engine - Implementation Plan

Current status: **Phases 1-6 complete**, **Phase 7 remaining**.

This plan tracks the scoped product direction: Supplier Engine with adaptive **Overview** and **Sidecar** modes.

---

## Phase 1: Platform Foundation ✅ Complete

- [x] Workspace and runtime setup (npm workspaces, frontend + backend wiring)
- [x] Shared schema contracts and baseline repositories
- [x] Firebase emulator-first local workflow
- [x] Seed and environment setup for deterministic local development

Acceptance:

- [x] Local dev bootstraps with one command
- [x] Core schema/repo patterns are stable and reusable

---

## Phase 2: Data and Ingestion Backbone ✅ Complete

- [x] Product and transaction data lifecycle
- [x] Supplier email/CSV ingestion services and job orchestration
- [x] Import status visibility in jobs and activity streams

Acceptance:

- [x] Data ingestion is observable and retryable
- [x] Inventory data remains consistent across imports

---

## Phase 3: Evaluator and Pricing Engine ✅ Complete

- [x] Price Check evaluator route and UI (`/buy-box`)
- [x] Pricing analysis contracts and landed-cost calculations
- [x] Market research helper routes and tools

Acceptance:

- [x] Evaluations return deterministic core metrics
- [x] Users can make buy/no-buy decisions from evaluator output

---

## Phase 4: Inventory and Stock Intelligence ✅ Complete

- [x] Inventory grid/drawer workflows
- [x] Transaction recording and stock status handling
- [x] Low-stock and valuation-aware views

Acceptance:

- [x] Inventory supports operational stock decisions
- [x] Product detail workflows are complete without legacy queue dependencies

---

## Phase 5: Sourcing and Operational Jobs ✅ Complete

- [x] Sourcing request lifecycle with transition validation
- [x] Jobs monitoring and retry controls
- [x] Dashboard integration for sourcing and operational health

Acceptance:

- [x] Sourcing statuses are validated and reliable
- [x] Operators can monitor and recover failed jobs

---

## Phase 6: Invoicing and Overview UX ✅ Complete

- [x] Invoices page and backend endpoint support
- [x] Dashboard overview polish and system status surfaces
- [x] Cross-page navigation reliability for operational workflows

Acceptance:

- [x] Invoicing is retained as a stable core feature
- [x] Overview mode presents clear KPI and activity context

---

## Phase 7: Sidecar Mode Hardening + Agent Execution 🚧 Remaining

Objective: make Supplier Engine side-by-side buying support production-ready.

### Work Items

- [ ] Sidecar layout hardening for narrow widths (Evaluator, Inventory, Invoices)
- [ ] Mode-adaptive behavior parity checks between Overview and Sidecar
- [ ] Remove residual legacy naming from planning/docs/rules
- [ ] Execute GSD planning and delivery loop for Sidecar milestone
- [ ] QA pass for key journeys: evaluator decision -> inventory awareness -> invoicing follow-up

### Acceptance

- [ ] Sidecar mode is usable at compact widths without blocking key actions
- [ ] Mode switch keeps user context and navigation stable
- [ ] QA swarm reports release-readiness with no P0 regressions

---

## Execution Notes

- Use `npm run gsd:sync` before running GSD command workflows in Cursor.
- Use Quality Lead + QA swarm before signoff on Phase 7 completion.
- Keep changes small and iterative; avoid large refactors.
