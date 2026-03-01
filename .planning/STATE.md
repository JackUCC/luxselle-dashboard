---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Unified Intelligence Rollout
current_phase: 9
current_phase_name: Unified Sourcing Intelligence and Frontend Polish
current_plan: Post-phase cleanup complete
status: milestone_complete
stopped_at: All 9 phases delivered. Out-of-GSD fixes applied 2026-03-01. Ready for next milestone.
last_updated: "2026-03-01T20:00:00.000Z"
last_activity: 2026-03-01
progress:
  total_phases: 9
  completed_phases: 9
  total_plans: 20
  completed_plans: 20
  percent: 100
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-01)

**Core Value:** Every purchase decision runs through this tool with price, serial, landed-cost, and operational context in one workflow.
**Current Focus:** v2.0 milestone complete. Stabilization fixes applied. Next milestone is v3.0 — Agentic Intelligence + ML improvements.

## Current Position

**Current Milestone:** v2.0 Unified Intelligence Rollout — COMPLETE
**All 9 phases delivered. 197/197 tests passing.**
**Last Activity:** 2026-03-01

## Out-of-GSD Changes (applied after Phase 9, not tracked in a plan)

These commits were delivered directly after Phase 9 without GSD phase tracking:

| Commit | What Changed | Status |
|--------|-------------|--------|
| dc508bf | Perplexity integration + price checker retrieval improvements | Deployed |
| 4d59615 | Perplexity badge in UI + deploy docs update | Deployed |
| 47ef46f | Dynamic AI routing (AiRouter replaces AiService for all providers) | Deployed |
| bf336c2 | Harden dynamic AI routing, remove runtime mock path | Deployed |
| 8d6306e | Fix price-check 503 when AI keys missing, health aiConfigured | Deployed |
| db4b8aa | Price Checker reliability: Perplexity fix, provenance, two-stage strategy, V2 schema | Deployed |
| 2bda162 | Clean up .env.example and Railway deploy docs | Deployed |

**Post-audit fixes applied 2026-03-01:**
- Fixed 2 failing env.test.ts tests (added vi.mock for dotenv to prevent .env loading during tests)
- Changed PERPLEXITY_SEARCH_MODEL default from `sonar-pro` to `sonar` (fixes auth failures on standard Perplexity plans)
- Updated health endpoint to expose per-provider availability and active model
- Updated .env and .env.example to reflect sonar model defaults

## Known Issues

### AI Provider Issues (production)
**Symptom:** Price check, market research, and serial checker return empty/zero results.
**Root cause:** Two compounding issues:
  1. `sonar-pro` model requires Perplexity premium tier — standard API keys fail with 402/403
  2. Both providers silently return empty search results when they fail, leading to €0 price outputs instead of a clear "provider unavailable" error
**Fixes applied:** sonar-pro → sonar default (fixes issue 1). Issue 2 (silent failures) tracked as tech debt for Phase 10.

### Local Development API Keys
**Symptom:** AI features don't work locally — placeholder keys in `.env`.
**Root cause:** `.env` ships with placeholder values for OPENAI_API_KEY and PERPLEXITY_API_KEY.
**Fix:** User must replace placeholders in `.env` with real API keys before local AI features work.
**Guidance:** Set `AI_ROUTING_MODE=openai` and only `OPENAI_API_KEY` if you don't have a Perplexity key.

## Next Milestone: v3.0 — Agentic Intelligence + Reliability

See ROADMAP.md for planned phases. Pending requirements:
- **INTEL-02**: Agentic Market Intelligence (background + on-demand competitor scraping)
- **ML-01**: ML/API intelligence upgrades (price prediction confidence, trend signaling)
- **QUAL-01**: Inventory + Invoice end-to-end verification
- **STAB-01**: AI provider reliability (better error surfacing, fallback UI)

## Performance Metrics

**By Phase:**

| Phase | Plans | Total | Status |
|-------|-------|-------|--------|
| 1-6 | 12 | Complete | Legacy (pre-GSD) |
| 7 | 2 | Complete | 2026-02-28 |
| 8 | 3 | Complete | 2026-03-01 |
| 9 | 3 | Complete | 2026-03-01 |

## Accumulated Context

### Key Decisions

- [Phase 7]: Harden compact Sidecar UX before introducing new feature scope.
- [Phase 7]: Keep Overview and Sidecar behavior parity for overlapping actions.
- [Phase 07]: Preserve active route on sidecar exit by removing only mode query state
- [Phase 07]: Use compact-first action layouts for sidecar route headers
- [Phase 08]: Expose Jobs + activity surfaces by wiring existing backend endpoints into UI routes and dashboard feed.
- [Phase 09]: Consolidate price, serial, and landed-cost workflows into unified `/evaluate` route with legacy redirects.
- [Post-09]: Dynamic AI routing — Perplexity preferred for web_search, OpenAI preferred for structured extraction
- [Post-09]: Use `sonar` (not `sonar-pro`) as default Perplexity model for broader API key compatibility
- [Post-09]: Price check provenance filter — comps must have a source URL backed by search annotations

### Pending Todos

- INTEL-02: Agentic Market Intelligence background monitoring + deep-dive execution flow.
- ML-01: Price prediction confidence and trend signal improvements.
- STAB-01: Surface AI provider errors in the UI instead of silently returning €0.
- QUAL-01: Verify Inventory and Invoice flows end-to-end (status changes, create/save/export, edge cases).

### Tech Debt

- Silent AI failures: searchMarket catches all errors and returns empty; price check returns €0 instead of surfacing "provider unavailable" to the user
- Auth middleware deferred (server.ts line 27 comment; all API routes currently unprotected)
- Phases 1-6 have no VERIFICATION.md files (pre-GSD; ROADMAP.md is authoritative)

## Session Continuity

**Last Session:** 2026-03-01T20:00:00.000Z
**Stopped At:** Post-v2.0 stabilization complete. Tests: 197/197 passing.
**Resume File:** None — start next milestone with /gsd:new-milestone or /gsd:plan-phase 10
