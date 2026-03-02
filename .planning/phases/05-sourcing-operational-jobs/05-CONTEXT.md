---
phase: 05
name: Sourcing and Operational Jobs
milestone: v1.0
requirements: [OPS-01, OPS-02, OPS-03]
status: complete
backfilled: 2026-03-02
---

# Phase 5 Context: Sourcing and Operational Jobs

## Phase Goal

Deliver a reliable sourcing lifecycle with strict status transition validation, an operational jobs monitor with safe retry controls, and dashboard visibility for sourcing and operations health.

## Why This Backfill Exists

Phase 5 shipped before GSD phase artifacts were standardized in this repo. The implementation has been live, but this folder previously contained only `.gitkeep`. This backfill captures explicit context, execution, and verification evidence.

## Requirements in Scope

| ID | Requirement | Closure |
|----|-------------|---------|
| OPS-01 | Sourcing lifecycle transitions are validated and enforced | `packages/server/src/routes/sourcing.ts` + `packages/server/src/lib/sourcingStatus.ts` |
| OPS-02 | Jobs monitoring surfaces failures and supports retries | `packages/server/src/routes/jobs.ts`, `src/pages/Jobs/JobsView.tsx`, and Phase 8 route/nav wiring |
| OPS-03 | Dashboard reflects sourcing and operational health | `src/pages/Dashboard/DashboardView.tsx` (`/dashboard/activity`) + sourcing widgets |

## Verified Baseline

- `packages/server/src/routes/sourcing.ts` enforces transition graph rules via `isValidSourcingTransition` and returns structured `BAD_REQUEST` payloads for invalid transitions.
- `packages/server/src/routes/jobs.ts` validates retryability (`failed|fail` only + max retry guard) before queueing retries.
- `src/pages/Jobs/JobsView.tsx` loads jobs, supports status filtering, and exposes retry actions with user feedback.
- `src/pages/Dashboard/DashboardView.tsx` fetches KPIs, profit summary, and activity feed, and renders recent activity.

## Success Criteria

1. Sourcing requests cannot bypass allowed status transitions.
2. Failed jobs can be retried safely with guardrails and are visible in UI navigation.
3. Dashboard surfaces operations activity and sourcing context for operators.
