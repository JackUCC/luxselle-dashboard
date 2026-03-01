# Requirements: Luxselle Supplier Engine

**Defined:** 2026-02-28
**Core Value:** Every purchase decision runs through this tool - enter an item, get everything needed before committing.

## v1 Requirements

### Platform Foundation

- [x] **PLAT-01**: Local development boots with one command across emulators, backend, and frontend.
- [x] **PLAT-02**: Shared schema contracts are enforced between frontend and backend.
- [x] **PLAT-03**: Firebase emulator-first workflow is the default for local iteration.
- [x] **PLAT-04**: Seeded data is available for deterministic local testing and demos.

### Data and Ingestion Backbone

- [x] **DATA-01**: Product and transaction ingestion lifecycle persists correctly.
- [x] **DATA-02**: Supplier email/CSV ingestion is retryable and observable through jobs.
- [x] **DATA-03**: Import status is visible in jobs and activity surfaces.

### Evaluator and Pricing

- [x] **EVAL-01**: `/buy-box` evaluator returns actionable buy/no-buy metrics.
- [x] **EVAL-02**: Landed-cost and pricing calculations are consistent between API and UI.
- [x] **EVAL-03**: Market research helper workflows are available and storable.

### Inventory and Stock Intelligence

- [x] **INV-01**: Inventory grid and drawer support full product detail workflows.
- [x] **INV-02**: Transaction recording updates stock/status correctly.
- [x] **INV-03**: Low-stock and valuation signals are visible for operational decisions.

### Sourcing and Operations

- [x] **OPS-01**: Sourcing lifecycle transitions are validated and enforced.
- [x] **OPS-02**: Jobs monitoring surfaces failures and supports retries.
- [x] **OPS-03**: Dashboard reflects sourcing and operational health.

### Invoicing and Overview UX

- [x] **FIN-01**: Invoice create/save/export workflows operate end-to-end.
- [x] **FIN-02**: Overview mode presents KPI and system-status context clearly.
- [x] **FIN-03**: Cross-page navigation remains reliable for operational flows.

### Sidecar Mode Hardening

- [x] **SIDE-01**: Sidecar layout remains usable at narrow widths across QuickCheck, SidecarView, Evaluator, Inventory, and Invoices.
- [x] **SIDE-02**: Mode switch between Overview and Sidecar preserves context and navigation intent.
- [x] **SIDE-03**: Mode-adaptive behavior parity is validated for shared user actions.
- [x] **SIDE-04**: Evaluator -> Inventory -> Invoices journey passes QA with no P0 regressions.

## v2 Requirements

### Unified Intelligence and Polish

- [x] **INTEL-01**: Unified Sourcing Intelligence page combines price, serial, and landed-cost in one description-first flow.
- [ ] **INTEL-02**: Agentic Market Intelligence supports continuous background monitoring and on-demand deep dives.
- [x] **UX-01**: Design consistency pass unifies spacing, typography, cards, loading, and empty states.
- [x] **UX-02**: Sidebar visual cleanup improves icon/spacing/grouping clarity.
- [ ] **ML-01**: ML/API intelligence upgrades improve price prediction confidence and trend signaling.

## v3 Requirements

### AI Reliability and Stability

- [ ] **STAB-01**: AI provider failures are surfaced clearly in the UI (not silently returning €0); recoverable error states with actionable guidance shown to users.

### Operational Verification

- [ ] **QUAL-01**: Inventory and Invoice flows verified end-to-end: all status transitions, create/save/export, and edge cases covered with test evidence.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile app | Web-first priority for current milestone |
| Customer-facing features | Internal operator tool only |
| Multi-user team accounts | Single-operator workflow for this cycle |
| Real-time push notifications | Not required for current release gate |
| Public marketplace listing integrations | Deferred to future milestone |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PLAT-01 | Phase 1 | Complete |
| PLAT-02 | Phase 1 | Complete |
| PLAT-03 | Phase 1 | Complete |
| PLAT-04 | Phase 1 | Complete |
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Complete |
| DATA-03 | Phase 2 + Phase 8 (gap closure) | Complete |
| EVAL-01 | Phase 3 | Complete |
| EVAL-02 | Phase 3 | Complete |
| EVAL-03 | Phase 3 | Complete |
| INV-01 | Phase 4 | Complete |
| INV-02 | Phase 4 | Complete |
| INV-03 | Phase 4 | Complete |
| OPS-01 | Phase 5 | Complete |
| OPS-02 | Phase 5 + Phase 8 (gap closure) | Complete |
| OPS-03 | Phase 5 | Complete |
| FIN-01 | Phase 6 | Complete |
| FIN-02 | Phase 6 | Complete |
| FIN-03 | Phase 6 | Complete |
| SIDE-01 | Phase 7 | Complete |
| SIDE-02 | Phase 7 | Complete |
| SIDE-03 | Phase 7 | Complete |
| SIDE-04 | Phase 7 | Complete |
| INTEL-01 | Phase 9 | Complete |
| UX-01 | Phase 9 | Complete |
| UX-02 | Phase 9 | Complete |
| INTEL-02 | Phase 11 | Planned |
| ML-01 | Phase 12 | Planned |
| STAB-01 | Phase 10 | Planned |
| QUAL-01 | Phase 12 | Planned |

**Coverage:**
- v1 requirements: 23 total, all satisfied
- v2 requirements: 5 total, 3 satisfied (INTEL-02 and ML-01 pending)
- v3 requirements: 2 total, 0 satisfied (STAB-01, QUAL-01 pending)
- Total unmapped: 0

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-03-01 after Phase 9 completion + v3 planning*
