# Roadmap: Luxselle Supplier Engine

## Milestone v1.0: Supplier Engine Sidecar Release

**Milestone Goal:** Stabilize the existing Supplier Engine surfaces and ship Sidecar mode as a production-ready workflow without operational regressions.

## Overview

Core Supplier Engine capabilities are already implemented across phases 1-6. Phase 7 completes the remaining release-critical sidecar hardening work: compact-width usability, mode parity, and QA gates across evaluator, inventory, and invoicing journeys.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3) are planned milestone work.
- Decimal phases (for example 6.1) are urgent insertions if needed.

- [x] **Phase 1: Platform Foundation** - Workspace, contracts, and emulator-first baseline.
- [x] **Phase 2: Data and Ingestion Backbone** - Product/supplier ingestion and observability.
- [x] **Phase 3: Evaluator and Pricing Engine** - Buy-box decision tooling and landed-cost support.
- [x] **Phase 4: Inventory and Stock Intelligence** - Inventory operations and low-stock awareness.
- [x] **Phase 5: Sourcing and Operational Jobs** - Sourcing lifecycle and job reliability controls.
- [x] **Phase 6: Invoicing and Overview UX** - Invoicing workflows and operational overview polish.
- [x] **Phase 7: Sidecar Mode Hardening + Agent Execution** - Compact UX hardening, parity checks, and release QA. (completed 2026-02-28)
- [ ] **Phase 8: Jobs and Activity Visibility** - Wire JobsView into app routing and surface activity feed data in the UI. (closes OPS-02, DATA-03 gaps from v1.0 audit)

## Phase Details

### Phase 1: Platform Foundation
**Goal:** Establish a reliable local development and contract foundation for all Supplier Engine work.
**Depends on:** Nothing (first phase)
**Requirements:** [PLAT-01, PLAT-02, PLAT-03, PLAT-04]
**Requirements**: [PLAT-01, PLAT-02, PLAT-03, PLAT-04]
**Success Criteria** (what must be TRUE):
  1. Local environment boots predictably with one command.
  2. Shared contracts prevent frontend/backend drift.
  3. Emulator + seed data flow supports deterministic testing.
**Plans:** 2/2 plans complete

Plans:
- [x] 01-01: Workspace wiring, shared contracts, and emulator setup
- [x] 01-02: Seed strategy and deterministic local data workflow

### Phase 2: Data and Ingestion Backbone
**Goal:** Make supplier/product ingestion reliable, retryable, and observable.
**Depends on:** Phase 1
**Requirements:** [DATA-01, DATA-02, DATA-03]
**Requirements**: [DATA-01, DATA-02, DATA-03]
**Success Criteria** (what must be TRUE):
  1. Product and transaction ingestion persists correctly.
  2. Supplier imports can be retried and monitored.
  3. Import status appears in jobs and activity streams.
**Plans:** 2/2 plans complete

Plans:
- [x] 02-01: Product and transaction ingestion lifecycle implementation
- [x] 02-02: Supplier import orchestration with status visibility

### Phase 3: Evaluator and Pricing Engine
**Goal:** Deliver decision-grade price and landed-cost analysis in evaluator workflows.
**Depends on:** Phase 2
**Requirements:** [EVAL-01, EVAL-02, EVAL-03]
**Requirements**: [EVAL-01, EVAL-02, EVAL-03]
**Success Criteria** (what must be TRUE):
  1. Evaluator returns clear buy/no-buy metrics.
  2. Landed-cost math is consistent across API and UI.
  3. Market research helper workflows are integrated and usable.
**Plans:** 2/2 plans complete

Plans:
- [x] 03-01: Evaluator route/UI and pricing analysis contracts
- [x] 03-02: Landed-cost + market research helper integration

### Phase 4: Inventory and Stock Intelligence
**Goal:** Ensure inventory operations support accurate stock decisions.
**Depends on:** Phase 3
**Requirements:** [INV-01, INV-02, INV-03]
**Requirements**: [INV-01, INV-02, INV-03]
**Success Criteria** (what must be TRUE):
  1. Inventory grid and drawer support core operational actions.
  2. Transactions update stock and status without drift.
  3. Low-stock and valuation views inform purchasing choices.
**Plans:** 2/2 plans complete

Plans:
- [x] 04-01: Inventory grid/drawer operational workflows
- [x] 04-02: Transaction correctness and stock-intelligence visibility

### Phase 5: Sourcing and Operational Jobs
**Goal:** Make sourcing transitions and operational jobs robust and recoverable.
**Depends on:** Phase 4
**Requirements:** [OPS-01, OPS-02, OPS-03]
**Requirements**: [OPS-01, OPS-02, OPS-03]
**Success Criteria** (what must be TRUE):
  1. Sourcing lifecycle transitions are validated.
  2. Failed jobs are visible and retryable.
  3. Dashboard reflects operational/sourcing health.
**Plans:** 2/2 plans complete

Plans:
- [x] 05-01: Sourcing lifecycle transitions and route validation
- [x] 05-02: Jobs monitor/retry and dashboard health integration

### Phase 6: Invoicing and Overview UX
**Goal:** Finalize invoicing and overview capabilities for day-to-day operations.
**Depends on:** Phase 5
**Requirements:** [FIN-01, FIN-02, FIN-03]
**Requirements**: [FIN-01, FIN-02, FIN-03]
**Success Criteria** (what must be TRUE):
  1. Invoices can be created, saved, and exported reliably.
  2. Overview mode communicates KPI and status clearly.
  3. Navigation across operational pages remains stable.
**Plans:** 2/2 plans complete

Plans:
- [x] 06-01: Invoice creation, persistence, and export workflows
- [x] 06-02: Overview polish and cross-page navigation reliability

### Phase 7: Sidecar Mode Hardening + Agent Execution
**Goal:** Make side-by-side buying support production-ready in compact Sidecar mode.
**Depends on:** Phase 6
**Requirements:** [SIDE-01, SIDE-02, SIDE-03, SIDE-04]
**Requirements**: [SIDE-01, SIDE-02, SIDE-03, SIDE-04]
**Success Criteria** (what must be TRUE):
  1. Sidecar remains usable at compact widths without blocking key actions.
  2. Mode switches preserve user context and route intent.
  3. Key evaluator -> inventory -> invoicing journey passes QA without P0 regressions.
**Plans:** 2/2 plans complete

Plans:
- [ ] 07-01: Compact sidecar layout hardening and mode parity fixes
- [ ] 07-02: Sidecar journey QA, regression validation, and release gate checks

### Phase 8: Jobs and Activity Visibility
**Goal:** Surface operational job status and activity feed data that are fully implemented in the backend but unreachable in the current UI.
**Depends on:** Phase 7
**Requirements:** [OPS-02, DATA-03]
**Gap Closure:** Closes gaps from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. Users can navigate to `/jobs` and see running/failed jobs with retry capability.
  2. Activity feed data from `GET /api/dashboard/activity` is surfaced in the UI.
  3. Tests cover the `/jobs` route and activity data path.

Plans:
- [ ] 08-01: Jobs and Activity Visibility

## Progress

**Execution Order:**
1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Platform Foundation | 2/2 | Complete | 2026-02-27 |
| 2. Data and Ingestion Backbone | 2/2 | Complete | 2026-02-27 |
| 3. Evaluator and Pricing Engine | 2/2 | Complete | 2026-02-27 |
| 4. Inventory and Stock Intelligence | 2/2 | Complete | 2026-02-27 |
| 5. Sourcing and Operational Jobs | 2/2 | Complete | 2026-02-27 |
| 6. Invoicing and Overview UX | 2/2 | Complete | 2026-02-27 |
| 7. Sidecar Mode Hardening + Agent Execution | 2/2 | Complete | 2026-02-28 |
| 8. Jobs and Activity Visibility | 0/1 | Not started | - |
