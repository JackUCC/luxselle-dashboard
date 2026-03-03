---
phase: 10-ai-reliability-provider-diagnostics
plan: 02
subsystem: ui
tags: [react, typescript, tailwind, error-states, provider-diagnostics]

# Dependency graph
requires:
  - phase: 10-01
    provides: provider_unavailable dataSource value in PriceCheckResult schema and providerStatus in MarketResearch API response
provides:
  - Distinct red "AI search unavailable" banner in UnifiedIntelligenceView when dataSource === 'provider_unavailable'
  - Distinct red "AI search unavailable" banner in EvaluatorView when dataSource === 'provider_unavailable'
  - Distinct red "AI search unavailable" banner in MarketResearchView when providerStatus === 'unavailable'
  - ResearchDataSourceBadge component handling all three dataSource values (web_search, ai_fallback, provider_unavailable)
  - providerStatus field in MarketResearchResult frontend type
affects: [UnifiedIntelligenceView, EvaluatorView, MarketResearchView]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "3-way dataSource branch: provider_unavailable (red) → comps.length > 0 (list) → empty (amber)"
    - "Conditional banner above result panel for providerStatus === 'unavailable'"
    - "Extracted ResearchDataSourceBadge component for reusable dataSource badge rendering"

key-files:
  created:
    - src/pages/UnifiedIntelligence/ResearchDataSourceBadge.tsx
  modified:
    - src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx
    - src/pages/BuyBox/EvaluatorView.tsx
    - src/pages/MarketResearch/MarketResearchView.tsx
    - src/pages/MarketResearch/types.ts

key-decisions:
  - "Banner renders ABOVE (not instead of) the MarketResearchResultPanel so degraded structural output (recommendation: hold, etc.) remains visible"
  - "ResearchDataSourceBadge extracted as shared component to DRY up the badge logic in UnifiedIntelligenceView"
  - "Red/orange color scheme for provider_unavailable (border-red-200 bg-red-50/50) mirrors the amber pattern for ai_fallback, maintaining design system consistency"

patterns-established:
  - "provider_unavailable: 3-way branch before comps list — first check dataSource, then comps.length, then empty state"
  - "providerStatus banner: additive overlay above result panel rather than replacement"

requirements-completed: [STAB-01]

# Metrics
duration: 5min
completed: 2026-03-03
---

# Phase 10 Plan 02: AI Provider Unavailable UI States Summary

**Three frontend views now show a distinct red "AI search unavailable" error banner with actionable guidance when AI providers fail, replacing the misleading amber "No comparable listings found" box.**

## Performance

- **Duration:** 5 min (implementation pre-existed in prior commit d97d184)
- **Started:** 2026-03-03T10:02:00Z
- **Completed:** 2026-03-03T10:07:00Z
- **Tasks:** 2 automated tasks complete
- **Files modified:** 5

## Accomplishments

- UnifiedIntelligenceView now uses `ResearchDataSourceBadge` component (extracted for reuse) which handles `provider_unavailable` and shows the 3-way comps/error branch
- EvaluatorView has both badge and comps area `provider_unavailable` branches — red error box with API key guidance appears instead of amber "No comparable listings found"
- MarketResearchView renders the red "AI search unavailable" banner above the result panel when `providerStatus === 'unavailable'`, and `types.ts` carries the `providerStatus` field

## Task Commits

Implementation was present in prior commit:

1. **Task 1: Add provider_unavailable state to UnifiedIntelligenceView and EvaluatorView** - `d97d184` (feat)
2. **Task 2: Add provider unavailable state to MarketResearchView** - `d97d184` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/pages/UnifiedIntelligence/ResearchDataSourceBadge.tsx` - Extracted badge component; handles web_search (emerald), ai_fallback (amber), provider_unavailable (red)
- `src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx` - Uses ResearchDataSourceBadge for badge, 3-way branch in comps area for provider_unavailable
- `src/pages/BuyBox/EvaluatorView.tsx` - Inline badge ternary extended with provider_unavailable branch; 3-way comps branch with red error box
- `src/pages/MarketResearch/MarketResearchView.tsx` - Red banner inserted above MarketResearchResultPanel when providerStatus === 'unavailable'
- `src/pages/MarketResearch/types.ts` - `providerStatus?: 'available' | 'unavailable'` added to MarketResearchResult interface

## Decisions Made

- Banner in MarketResearchView renders ABOVE (not instead of) the result panel — the degraded structural analysis (recommendation, price range) still has marginal utility to users
- `ResearchDataSourceBadge` was extracted as a standalone component in UnifiedIntelligenceView, reducing duplication and keeping the badge logic in one place
- Red styling (`border-red-200 bg-red-50/50 text-red-800`) mirrors the existing amber pattern (`border-amber-200 bg-amber-50/50 text-amber-800`), maintaining design system consistency

## Deviations from Plan

None - plan executed exactly as specified. The implementation was already present from the prior broad implementation commit (d97d184).

## Issues Encountered

None - `npm run typecheck` passes clean (0 errors), `npm test` passes 230/230 tests.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 10 (AI Reliability + Provider Diagnostics) is fully complete — both plans executed
- Frontend now correctly distinguishes provider failure from genuine lack of market data
- Users see actionable guidance (check API keys) rather than a misleading "No data" message
- Ready to proceed to Phase 11: Agentic Market Intelligence

## Self-Check: PASSED

- FOUND: src/pages/UnifiedIntelligence/ResearchDataSourceBadge.tsx
- FOUND: src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx
- FOUND: src/pages/BuyBox/EvaluatorView.tsx
- FOUND: src/pages/MarketResearch/MarketResearchView.tsx
- FOUND: src/pages/MarketResearch/types.ts
- FOUND: 10-02-SUMMARY.md
- FOUND: commit d97d184 (implementation)

---
*Phase: 10-ai-reliability-provider-diagnostics*
*Completed: 2026-03-03*
