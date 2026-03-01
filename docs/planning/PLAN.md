# Luxselle Supplier Engine - Implementation Plan

Current status: **Phases 1-9 complete** (including unified `/evaluate` decision flow rollout).

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

- [x] Price Check evaluator route and UI (legacy `/buy-box`, now unified at `/evaluate`)
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
- [x] Product detail workflows are complete without queue dependencies

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

## Phase 7: Sidecar Mode Hardening + Agent Execution ✅ Complete

Objective: make Supplier Engine side-by-side buying support production-ready.

### Work Items

- [x] Sidecar layout hardening for narrow widths: QuickCheck.tsx, SidecarView.tsx (overflow/min-width), and Evaluator, Inventory, Invoices in compact layout
- [x] Mode-adaptive behavior parity checks between Overview and Sidecar
- [x] Remove residual legacy naming from planning/docs/rules
- [x] Create GSD planning baseline files (`.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md`) and seed Phase 7 context
- [x] Create Phase 7 plan files (`07-01-PLAN.md`, `07-02-PLAN.md`) with requirement coverage and execution waves
- [x] Execute GSD planning and delivery loop for Sidecar milestone (run GSD plan-phase / execute-phase for sidecar UX via Cursor GSD commands)
- [x] QA pass for key journeys: evaluator decision -> inventory awareness -> invoicing follow-up
- [x] Stabilize pre-existing evaluator nav-routing E2E regression in `tests/e2e/evaluator.spec.ts`

### Acceptance

- [x] Sidecar mode is usable at compact widths without blocking key actions
- [x] Mode switch keeps user context and navigation stable
- [x] Targeted E2E QA reports release-readiness with no P0 regressions in Phase 7 scope

---

## Phase 8: Jobs and Activity Visibility ✅ Complete

- [x] Wire `/jobs` into route and navigation metadata
- [x] Surface dashboard activity feed from `GET /api/dashboard/activity`
- [x] Add backend + e2e test coverage for jobs retry and activity visibility

Acceptance:

- [x] Jobs route reachable from dock and mobile nav
- [x] Activity feed visible in dashboard
- [x] Focused tests pass for the jobs/activity path

---

## Phase 9: Unified Sourcing Intelligence and Frontend Polish ✅ Complete

- [x] Add unified `/evaluate` page with description-first flow
- [x] Combine price check + optional serial context + always-visible landed cost
- [x] Redirect legacy `/buy-box`, `/serial-check`, and `/evaluator` to `/evaluate` with query preservation
- [x] Add landed-cost prefill from decision target in overview mode
- [x] Clean up navigation grouping/spacing and consolidate check entry to `Evaluate`
- [x] Update focused e2e suites for unified flow + sidecar parity

Acceptance:

- [x] Unified evaluator flow works end-to-end on one route
- [x] Legacy links remain compatible through redirects
- [x] Sidecar parity remains intact
- [x] Targeted e2e and full unit test suites pass

---

## Execution Notes

- Use `npm run gsd:sync` before running GSD command workflows in Cursor.
- Use `node ./.claude/get-shit-done/bin/gsd-tools.cjs validate health` to validate local planning integrity.
- Recommended GSD sequence for future phases: `/gsd:execute-phase <n>` -> `/gsd:verify-work <n>`.
- Recent execution evidence:
  - `tests/e2e/evaluator.spec.ts tests/e2e/dashboard-shell.spec.ts tests/e2e/sidecar-flow.spec.ts` (all green)
  - `npm test` full suite passing
- Next planning focus completed: Phase 11 (`INTEL-02`) and Phase 12 (`QUAL-01` + `ML-01`) plan artifacts are now drafted in `.planning/phases/`.
- Next execution focus: `/gsd:execute-phase 10` (Plans 10-01 and 10-02).
- Keep changes small and iterative; avoid large refactors.
