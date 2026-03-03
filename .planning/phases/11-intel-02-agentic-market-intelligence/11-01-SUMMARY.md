---
phase: 11-intel-02-agentic-market-intelligence
plan: "01"
subsystem: api
tags: [zod, vitest, market-intelligence, ai-telemetry, firestore]

# Dependency graph
requires:
  - phase: 10-ai-provider-resilience
    provides: RoutedTaskResult with provider field used as aiUsage.provider source
provides:
  - MarketIntelRun schema with optional aiUsage field (callCount, provider, estimatedCostEur)
  - MarketIntelMonitorService.executeRun() persists aiUsage on succeeded runs
  - Unit tests for MarketIntelMonitorService (getFreshnessStatus, runBackground, runDeepDive, listSnapshots)
affects: [11-02, 11-03, market-intel-api, market-intel-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "aiUsage telemetry: Zod optional object on run doc, computed from fixed COST_PER_CALL_EUR constant"
    - "TDD RED-GREEN: schema test first, then GREEN with schema change; service test first, then GREEN with service change"
    - "STANDARD_ANALYSE_CALL_COUNT=3 as named constant to document the expandQuery+searchMarket+extractStructuredJson pipeline"

key-files:
  created:
    - packages/shared/src/schemas/marketIntel.test.ts
    - packages/server/src/services/market-research/MarketIntelMonitorService.test.ts
  modified:
    - packages/shared/src/schemas/marketIntel.ts
    - packages/server/src/services/market-research/MarketIntelMonitorService.ts

key-decisions:
  - "COST_PER_CALL_EUR=0.004 stored as constant in service file, not in schema — schema only validates shape"
  - "STANDARD_ANALYSE_CALL_COUNT=3 is a fixed constant (expandQuery + searchMarket + extractStructuredJson) not derived at runtime"
  - "Failed runs do not get aiUsage — partial runs get no cost attribution, preserving data integrity"
  - "estimatedCostEur rounded to 3 decimal places via Math.round(x * 1000) / 1000"

patterns-established:
  - "AI telemetry: capture provider+callCount+cost from result.provider after each analyse() call"
  - "TDD for schema changes: write failing parse tests first, then add Zod field"

requirements-completed: [INTEL-02]

# Metrics
duration: 9min
completed: 2026-03-03
---

# Phase 11 Plan 01: AI Usage Telemetry for Market Intelligence Runs Summary

**Per-run AI usage telemetry (callCount=3, provider, estimatedCostEur=0.012 EUR) captured on all succeeded market intel runs via MarketIntelRunSchema.aiUsage and MarketIntelMonitorService.executeRun()**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-03T10:25:44Z
- **Completed:** 2026-03-03T10:34:22Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added `aiUsage` optional Zod object to `MarketIntelRunSchema` with validation for non-negative callCount, provider string, non-negative estimatedCostEur
- Added `COST_PER_CALL_EUR=0.004` and `STANDARD_ANALYSE_CALL_COUNT=3` constants to `MarketIntelMonitorService`
- `executeRun()` now computes and persists `aiUsage` to Firestore on the succeeded run path; failed runs intentionally exclude it
- Created 5 schema unit tests and 6 service unit tests; all 241 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add aiUsage telemetry field to MarketIntelRun schema** - `53201d7` (feat)
2. **Task 2: Capture aiUsage in executeRun and add MarketIntelMonitorService unit tests** - `1ba9847` (feat)

**Plan metadata:** _(docs commit pending)_

_Note: TDD tasks had RED-GREEN cycle. Task 1: schema tests RED, schema change GREEN. Task 2: service tests RED, service change GREEN._

## Files Created/Modified
- `packages/shared/src/schemas/marketIntel.ts` - Added aiUsage optional object field to MarketIntelRunSchema
- `packages/shared/src/schemas/marketIntel.test.ts` - 5 Zod parse/safeParse tests for aiUsage field
- `packages/server/src/services/market-research/MarketIntelMonitorService.ts` - COST_PER_CALL_EUR constant, aiUsage computation and persistence in executeRun()
- `packages/server/src/services/market-research/MarketIntelMonitorService.test.ts` - 6 unit tests for getFreshnessStatus, runBackground, runDeepDive, listSnapshots

## Decisions Made
- Cost constant (`COST_PER_CALL_EUR = 0.004`) lives in the service file, not in the Zod schema — schema validates shape only, not business rules
- `STANDARD_ANALYSE_CALL_COUNT = 3` is a named constant documenting the fixed pipeline (expandQuery + searchMarket + extractStructuredJson) rather than computed dynamically
- Failed runs omit `aiUsage` by design: partial/errored runs should not accrue cost attribution since no result was produced
- Cost rounded to 3 decimal places (0.012 EUR for 3 calls) to avoid floating-point precision noise

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- A background IDE commit (`e4e5088`) captured the test file and constant additions before the plan tasks were formally committed. This was handled by committing only the final aiUsage persistence change (`aiUsage` in `runRepo.set()`) as Task 2.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `MarketIntelRun.aiUsage` is now part of the shared schema and queryable via `MarketIntelRunRepo`
- Run records in Firestore will accumulate `aiUsage` metadata from this point forward
- Phase 11-02 can read `aiUsage` from run records for display or aggregation
- No blockers

---
*Phase: 11-intel-02-agentic-market-intelligence*
*Completed: 2026-03-03*

## Self-Check: PASSED
- packages/shared/src/schemas/marketIntel.ts: FOUND
- packages/shared/src/schemas/marketIntel.test.ts: FOUND
- packages/server/src/services/market-research/MarketIntelMonitorService.ts: FOUND
- packages/server/src/services/market-research/MarketIntelMonitorService.test.ts: FOUND
- .planning/phases/11-intel-02-agentic-market-intelligence/11-01-SUMMARY.md: FOUND
- Commit 53201d7: FOUND
- Commit 1ba9847: FOUND
