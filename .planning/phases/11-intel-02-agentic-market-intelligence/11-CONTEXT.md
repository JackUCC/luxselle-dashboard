---
phase: 11
name: INTEL-02 Agentic Market Intelligence
milestone: v3.0
requirement: INTEL-02
status: planned
---

# Phase 11 Context: INTEL-02 Agentic Market Intelligence

## Phase Goal

Build agentic market intelligence in two modes:
1. Scheduled background monitoring that refreshes competitor/trend intelligence and caches it.
2. On-demand deep-dive analysis for a specific item with richer context than the default market-research call.

## Why This Phase Exists

Current market intelligence endpoints are request-time only:
- `GET /api/market-research/trending` computes on request.
- `GET /api/market-research/competitor-feed` computes on request.
- `POST /api/market-research/analyse` computes on request.

That means:
- No cached-vs-live signal in UI.
- No run-cost telemetry.
- No durable monitoring history.
- No dedicated deep-dive execution path.

## Current Baseline

- `MarketResearchService` already has strong extraction flow, evidence-backed filtering, and degraded fallback.
- `SystemJobRepo` + `/api/jobs` + `JobRunner` already support asynchronous background jobs.
- `SavedResearchService` already persists analysis outputs and can be extended for deep-dive provenance.
- Dashboard/Market Research UI surfaces exist and can consume additional metadata fields.

## Locked Decisions

1. Reuse existing `system_jobs` lifecycle and add market-intel job types instead of introducing a new queue framework.
2. Persist market-intel cache snapshots in Firestore so UI can show age/staleness.
3. Track per-run AI usage metrics (calls, provider, estimated token/cost envelope) on each background/deep-dive run.
4. Keep rollout incremental: backend cache + trigger first, then deep-dive flow, then UI indicators.

## Out of Scope (Phase 11)

- Real-time websocket pushes for market updates.
- Cross-region distributed scheduler orchestration.
- Full autonomous buying recommendations.
- Replacing existing `/market-research/analyse` contract for default flow.

## Success Criteria

1. Background monitoring jobs can be scheduled/triggered and persist snapshots for trend + competitor intelligence.
2. On-demand deep-dive endpoint runs enriched analysis and stores results with run metadata.
3. Market Research UI shows live/cached freshness and deep-dive status.
4. Run-cost telemetry is saved and queryable per execution.
