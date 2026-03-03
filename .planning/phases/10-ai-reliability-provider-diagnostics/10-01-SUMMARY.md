---
phase: 10-ai-reliability-provider-diagnostics
plan: 01
subsystem: api
tags: [ai, search, zod, provider-diagnostics, error-handling]

# Dependency graph
requires: []
provides:
  - "PriceCheckResultSchema.dataSource enum with 'provider_unavailable' value"
  - "SearchService.SearchResponse.providerError flag with all-failed propagation"
  - "PriceCheckService early-exit returning dataSource: 'provider_unavailable' on search failure"
  - "MarketResearchResult.providerStatus field ('available' | 'unavailable')"
  - "GET /api/health?test_providers=1 returning per-provider ok/error diagnostics"
  - ".env.example with Perplexity tier documentation and test_providers=1 curl example"
affects:
  - "frontend provider_unavailable display logic"
  - "any feature consuming PriceCheckResult.dataSource"
  - "market-research UI reading providerStatus"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "providerError propagation: all sub-calls failed → set flag on merged result"
    - "early-exit pattern: check providerError before downstream AI extraction calls"
    - "provider health probe: per-provider live API ping in health endpoint"

key-files:
  created:
    - ".env.example"
  modified:
    - "packages/shared/src/schemas/pricing.ts"
    - "packages/server/src/services/search/SearchService.ts"
    - "packages/server/src/services/price-check/PriceCheckService.ts"
    - "packages/server/src/services/price-check/PriceCheckService.test.ts"
    - "packages/server/src/services/market-research/MarketResearchService.ts"
    - "packages/server/src/services/market-research/MarketResearchService.test.ts"
    - "packages/server/src/routes/pricing.test.ts"
    - "packages/server/src/server.ts"

key-decisions:
  - "provider_unavailable is a distinct dataSource enum value — not a 503 — enabling the frontend to display a meaningful 'providers down' state instead of silent €0"
  - "providerError only set on merged SearchResponse when ALL parallel sub-calls fail (partial success = usable data)"
  - "Health endpoint ?test_providers=1 mode makes live API calls per configured provider rather than just checking env var presence"
  - ".env.example documents sonar vs sonar-pro tier distinction to prevent silent API failures"

patterns-established:
  - "providerError propagation: when all parallel search calls fail, set providerError: true on merged result"
  - "early-exit on providerError: check flag immediately after search, return structured failure before touching AI extraction"
  - "providerStatus field: MarketResearchResult carries 'available' | 'unavailable' to surface provider state to callers"

requirements-completed:
  - STAB-01

# Metrics
duration: 25min
completed: 2026-03-03
---

# Phase 10 Plan 01: AI Provider Failure Propagation Summary

**AI provider failure signals propagated through backend stack — silent €0 results replaced with structured 'provider_unavailable' payloads and live health diagnostics**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-03T09:55:00Z
- **Completed:** 2026-03-03T10:00:00Z
- **Tasks:** 3 verified
- **Files modified:** 8

## Accomplishments

- SearchService propagates `providerError: true` on merged result when ALL parallel sub-calls fail (partial success is treated as usable data)
- PriceCheckService returns `dataSource: 'provider_unavailable'` with zero prices when providerError is set, skipping all AI extraction calls
- MarketResearchResult gains `providerStatus: 'available' | 'unavailable'` field; `buildDegradedAnalysis` sets it to `'unavailable'`
- `/api/health?test_providers=1` makes live per-provider API pings and returns structured `providerTests` object
- `.env.example` re-created with Perplexity tier guidance and test_providers=1 verification example
- 3 new tests added; 230 tests pass with zero regressions

## Task Commits

Tasks 1 and 2 were implemented in prior commits before this plan execution:
- **Tasks 1-2 (schema, SearchService, PriceCheckService, MarketResearchService + tests):** `d97d184`, `0f20446` — verified passing in current state (230 tests green)
- **Task 3: Health endpoint + .env.example** - `fed35b3` (feat: .env.example with AI provider tier docs)

**Plan metadata:** (created after this summary)

## Files Created/Modified

- `packages/shared/src/schemas/pricing.ts` - Extended dataSource enum to include 'provider_unavailable'
- `packages/server/src/services/search/SearchService.ts` - Added providerError?: boolean to SearchResponse; set on catch blocks; propagated in searchMarketMulti/MultiExpanded when all fail
- `packages/server/src/services/price-check/PriceCheckService.ts` - Early-exit returning dataSource: 'provider_unavailable' when searchResponse.providerError is set
- `packages/server/src/services/price-check/PriceCheckService.test.ts` - Added 'returns provider_unavailable when all search providers fail' test
- `packages/server/src/services/market-research/MarketResearchService.ts` - providerStatus field on interface; providerStatus: 'unavailable' in buildDegradedAnalysis; providerStatus: 'available' in formatResult; providerError early-exit in analyse()
- `packages/server/src/services/market-research/MarketResearchService.test.ts` - Added 'builds degraded analysis with providerStatus unavailable' test
- `packages/server/src/routes/pricing.test.ts` - Added 'returns 200 with provider_unavailable when service signals provider outage' test
- `packages/server/src/server.ts` - Extended /api/health with ?test_providers=1 mode making live per-provider pings
- `.env.example` - Re-created with AI tier docs and test_providers=1 curl example

## Decisions Made

- `provider_unavailable` is a 200 response (not 503) — the service always returns a structured result; the frontend decides how to display it
- `providerError` propagation uses "all failed" semantics: if any parallel search succeeds, the merged result is treated as usable data
- Health probe for OpenAI makes two calls: basic chat completion + JSON extraction (validates the code path used in production)
- Health probe for Perplexity uses direct HTTP fetch (not the SDK) to match production behavior

## Deviations from Plan

None - all plan-specified implementations were verified in place. Tasks 1-2 were pre-implemented in prior commits before this plan execution. Task 3 server.ts changes were already applied; only the `.env.example` file needed creating (it had been deleted in commit 6d7f844).

## Issues Encountered

The `.env.example` file had been deleted in a prior cleanup commit (`6d7f844: chore: remove example env and outdated docs`). It was re-created per the plan spec with enhanced AI section content documenting the Perplexity tier requirements.

## User Setup Required

None - no external service configuration required beyond following `.env.example` guidance.

## Next Phase Readiness

- Phase 10 Plan 01 complete: provider failure signals are structured and detectable
- Frontend can now display "providers unavailable" state instead of silent €0 on `dataSource === 'provider_unavailable'`
- `/api/health?test_providers=1` provides operational diagnostics for verifying API key connectivity
- Ready to proceed to Phase 10 Plan 02 (if applicable) or next phase

---
*Phase: 10-ai-reliability-provider-diagnostics*
*Completed: 2026-03-03*

## Self-Check: PASSED

Files verified:
- `.env.example` - FOUND (created in this execution, committed at fed35b3)
- `packages/shared/src/schemas/pricing.ts` - FOUND, contains 'provider_unavailable'
- `packages/server/src/services/search/SearchService.ts` - FOUND, contains providerError
- `packages/server/src/services/price-check/PriceCheckService.ts` - FOUND, contains early-exit
- `packages/server/src/services/market-research/MarketResearchService.ts` - FOUND, contains providerStatus

Commits verified:
- `fed35b3` - FOUND (feat(10-01): add .env.example)
- `d97d184` - FOUND (pre-existing implementation)
- `0f20446` - FOUND (pre-existing fixes)

Tests: 230/230 passed
