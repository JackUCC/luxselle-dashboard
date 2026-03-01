# Roadmap: Luxselle Supplier Engine

## Milestone v1.0: Supplier Engine Sidecar Release

**Milestone Goal:** Stabilize the existing Supplier Engine surfaces and ship Sidecar mode as a production-ready workflow without operational regressions.

## Overview

Core Supplier Engine capabilities are implemented across phases 1-8. Phase 9 delivers the first v2 step: unified sourcing intelligence UX (price + optional serial + landed-cost in one flow) plus navigation polish and regression coverage.

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
- [x] **Phase 8: Jobs and Activity Visibility** - Wire JobsView into app routing and surface activity feed data in the UI. (completed 2026-03-01)
- [x] **Phase 9: Unified Sourcing Intelligence and Frontend Polish** - Unify price/serial/landed flow on one route with nav cleanup and parity validation. (completed 2026-03-01)

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
- [x] 07-01: Compact sidecar layout hardening and mode parity fixes
- [x] 07-02: Sidecar journey QA, regression validation, and release gate checks

### Phase 8: Jobs and Activity Visibility
**Goal:** Surface operational job status and activity feed data that are fully implemented in the backend but unreachable in the current UI.
**Depends on:** Phase 7
**Requirements:** [OPS-02, DATA-03]
**Gap Closure:** Closes gaps from v1.0 audit
**Success Criteria** (what must be TRUE):
  1. Users can navigate to `/jobs` and see running/failed jobs with retry capability.
  2. Activity feed data from `GET /api/dashboard/activity` is surfaced in the UI.
  3. Tests cover the `/jobs` route and activity data path.
**Plans:** 3/3 plans complete

Plans:
- [x] 08-01-PLAN.md — Backend unit tests for POST /api/jobs/:id/retry and GET /api/dashboard/activity
- [x] 08-02-PLAN.md — Route wiring (/jobs in routeMeta + AnimatedRoutes) and activity feed in DashboardView
- [x] 08-03-PLAN.md — E2E navigation tests for /jobs and activity feed visibility

### Phase 9: Unified Sourcing Intelligence and Frontend Polish
**Goal:** Combine price-check, optional serial context, and landed-cost planning in one description-first route with cleaner navigation and parity coverage.
**Depends on:** Phase 8
**Requirements:** [INTEL-01, UX-01, UX-02]
**Success Criteria** (what must be TRUE):
  1. Unified `/evaluate` flow replaces split price/serial decision entry points.
  2. Legacy `/buy-box` and `/serial-check` links still resolve correctly through redirects.
  3. Landed-cost bid prefill works in overview mode from decision targets.
  4. E2E coverage validates unified flow and sidecar parity.
**Plans:** 3/3 plans complete

Plans:
- [x] 09-01-PLAN.md — Unified sourcing intelligence page and decision helper wiring
- [x] 09-02-PLAN.md — Route/nav migration, prefetch updates, and consistency pass
- [x] 09-03-PLAN.md — Sidebar cleanup and focused E2E parity updates

---

## Milestone v3.0: Agentic Intelligence + Reliability

**Milestone Goal:** Add agentic market intelligence capabilities and ensure the AI-powered features are robust and clearly communicate their status to users.

### Phase 10: AI Reliability + Provider Diagnostics
**Goal:** Make AI provider failures visible and recoverable — stop silently returning €0 and start surfacing clear "provider unavailable" states with actionable guidance.
**Depends on:** Phase 9
**Requirements:** [STAB-01]
**Success Criteria:**
  1. When both AI providers fail, price check and market research return a clear "provider unavailable" status (not silently €0).
  2. The UI shows a recoverable error state with guidance (check API keys, retry).
  3. `/api/health` response includes per-provider availability and the active routing mode.
  4. Local `.env` setup docs clearly explain which API keys are needed and how to test provider connectivity.
**Plans:** 2 plans

Plans:
- [ ] 10-01-PLAN.md — Backend: SearchService providerError flag, PriceCheckService early-exit, MarketResearchService providerStatus, shared schema extension, health test_providers mode; covering tests
- [ ] 10-02-PLAN.md — Frontend: provider_unavailable state in UnifiedIntelligenceView, EvaluatorView, and MarketResearchView; human-verify checkpoint

### Phase 11: INTEL-02 Agentic Market Intelligence
**Goal:** Build continuous background market monitoring and on-demand deep-dive research that feeds the Market Research and Competitor Activity surfaces.
**Depends on:** Phase 10
**Requirements:** [INTEL-02]
**Success Criteria:**
  1. Background jobs run scheduled competitor + trend scrapes and persist results.
  2. On-demand deep-dive mode triggers enriched research for a specific item.
  3. Market Research view shows live vs cached data indicators.
  4. Cost-aware: background jobs batch requests; cost is tracked per run.
**Plans:** 0/3 plans (not yet planned)

Plans:
- [ ] 11-01-PLAN.md — Background job scheduling: competitor scraping + caching architecture
- [ ] 11-02-PLAN.md — On-demand deep-dive: trigger flow, enrichment pipeline, result storage
- [ ] 11-03-PLAN.md — UI integration: live/cached indicators in Market Research; Competitor Activity feed

### Phase 12: Inventory + Invoice Verification + ML-01 Signal Improvements
**Goal:** Confirm all inventory and invoice flows work end-to-end, and improve price prediction confidence with ML/trend signal improvements.
**Depends on:** Phase 11
**Requirements:** [QUAL-01, ML-01]
**Success Criteria:**
  1. Inventory status changes, product creation, transaction recording work end-to-end with verified test coverage.
  2. Invoice create/save/export flow works with all edge cases covered.
  3. Price prediction confidence scores are more meaningful (reflect data volume + source quality).
  4. Trend signals from scraped data feed into price guidance.
**Plans:** 0/3 plans (not yet planned)

Plans:
- [ ] 12-01-PLAN.md — Inventory E2E verification: audit + test gaps, fix any broken flows
- [ ] 12-02-PLAN.md — Invoice E2E verification: create/save/export/edge cases
- [ ] 12-03-PLAN.md — ML-01: price confidence scoring + trend signal integration

---

## Progress

**Execution Order:**
1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Platform Foundation | 2/2 | Complete | 2026-02-27 |
| 2. Data and Ingestion Backbone | 2/2 | Complete | 2026-02-27 |
| 3. Evaluator and Pricing Engine | 2/2 | Complete | 2026-02-27 |
| 4. Inventory and Stock Intelligence | 2/2 | Complete | 2026-02-27 |
| 5. Sourcing and Operational Jobs | 2/2 | Complete | 2026-02-27 |
| 6. Invoicing and Overview UX | 2/2 | Complete | 2026-02-27 |
| 7. Sidecar Mode Hardening + Agent Execution | 2/2 | Complete | 2026-02-28 |
| 8. Jobs and Activity Visibility | 3/3 | Complete | 2026-03-01 |
| 9. Unified Sourcing Intelligence and Frontend Polish | 3/3 | Complete | 2026-03-01 |
| 10. AI Reliability + Provider Diagnostics | 0/2 | In Planning | — |
| 11. INTEL-02 Agentic Market Intelligence | 0/3 | Planned | — |
| 12. Inventory + Invoice Verification + ML-01 | 0/3 | Planned | — |
