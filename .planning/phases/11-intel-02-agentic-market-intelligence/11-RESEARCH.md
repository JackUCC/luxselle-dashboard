# Phase 11: INTEL-02 Agentic Market Intelligence - Research

**Researched:** 2026-03-01
**Domain:** Background monitoring jobs, cached intelligence snapshots, deep-dive orchestration, UI freshness states
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTEL-02 | Agentic Market Intelligence supports continuous background monitoring and on-demand deep dives | Existing `JobRunner`, `SystemJobRepo`, `MarketResearchService`, and `SavedResearchService` provide reusable seams for scheduling, persistence, and result rendering |
</phase_requirements>

---

## Summary

The current architecture already has the minimum primitives needed for agentic intelligence:
- Async job execution (`JobRunner`, `system_jobs`)
- Search + synthesis service (`MarketResearchService`)
- Persistence for user-facing research output (`saved_research`)

The missing part is orchestration and cache structure. Phase 11 should introduce a dedicated market-intelligence cache model and a monitor service that can:
1. refresh snapshots in background runs,
2. record run metadata/cost,
3. expose cached-vs-live metadata to the UI.

A staged 3-plan approach is feasible without new infrastructure dependencies:
- Plan 11-01: cache + scheduler pipeline
- Plan 11-02: deep-dive path and persistence
- Plan 11-03: UI/UX integration with freshness indicators

---

## Verified Codebase Seams

### Backend

- `packages/server/src/services/JobRunner.ts`
  - In-process async runner exists and already updates `system_jobs` status lifecycle.
- `packages/server/src/routes/jobs.ts`
  - Retry/cancel patterns already implemented and tested.
- `packages/server/src/services/market-research/MarketResearchService.ts`
  - Existing trend, competitor feed, and analyse methods can be reused by a higher-order monitor service.
- `packages/server/src/routes/market-research.ts`
  - Existing route surface is a natural place for cache/deep-dive endpoints.

### Frontend

- `src/pages/MarketResearch/MarketResearchView.tsx`
  - Already loads trending/feed and render states; can display freshness + deep-dive controls.
- `src/components/widgets/AiMarketPulseWidget.tsx`
  - Already consumes trending data and can surface stale/live badges.

### Shared Schemas

- `packages/shared/src/schemas/systemJob.ts`
  - Supports extensible `jobType` string and progress details.
- `packages/shared/src/schemas/savedResearch.ts`
  - Can absorb deep-dive metadata without breaking existing list/detail behavior.

---

## Recommended Architecture

1. Add cache entities:
- `market_intel_snapshots` (latest data + generatedAt + freshness)
- `market_intel_runs` (run telemetry, provider usage, estimated cost)

2. Add a monitor service that can:
- run scheduled refresh (`mode: background`)
- run targeted refresh (`mode: deep_dive`)
- write both snapshot and run records atomically enough for operational visibility

3. Extend market-research routes:
- read latest cached snapshot
- trigger deep-dive run
- optionally trigger manual background refresh for operators

4. Surface cache metadata in UI:
- "Live" when generated within freshness window
- "Cached" when stale but usable
- show run age and last run status

---

## Risks and Mitigations

1. Duplicate run overlap:
- Mitigation: acquire per-key lock (e.g., brand/model key) before starting deep-dive.

2. Cost spikes from aggressive schedules:
- Mitigation: fixed batch size + max concurrent runs + daily cap guardrails in env config.

3. UI confusion between degraded and cached:
- Mitigation: explicit status taxonomy (`live`, `cached`, `stale`, `unavailable`) and dedicated badges.

4. Persisting oversized payloads:
- Mitigation: store normalized summary payloads, not raw prompt transcripts.

---

## Validation Architecture

### Automated

- `npm run typecheck`
- `npm test -- packages/server/src/routes/market-research.test.ts`
- `npm test -- packages/server/src/services/market-research/MarketResearchService.test.ts`
- `npm run test:e2e -- market-research.spec.ts`

### Phase validation targets

- Background monitor produces persisted snapshots and job records.
- Deep-dive run produces enriched output and run metadata.
- UI clearly shows live vs cached context and last update age.
- Cost telemetry exists for each run and can be audited.
