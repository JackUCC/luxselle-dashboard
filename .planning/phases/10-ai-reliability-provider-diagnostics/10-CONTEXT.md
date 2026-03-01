---
phase: 10
name: AI Reliability + Provider Diagnostics
milestone: v3.0
requirement: STAB-01
status: planned
---

# Phase 10 Context: AI Reliability + Provider Diagnostics

## Phase Goal

Stop silently returning €0 when AI providers fail. Surface clear, recoverable "provider unavailable" states in the UI with actionable guidance.

## Background

After the dynamic AI routing + Perplexity integration (post-Phase 9 commits), three AI-powered features
(price check, market research, serial checker) stopped working in certain environments.

**Root causes identified (audit 2026-03-01):**
1. `PERPLEXITY_SEARCH_MODEL=sonar-pro` required premium Perplexity tier — standard API keys fail with 402/403
   - **Fixed**: Changed default from `sonar-pro` → `sonar` in `env.ts` and `.env`
2. Both providers fail silently — `searchMarket()` in `SearchService.ts` catches ALL errors and returns empty
   - `PriceCheckService.check()` then runs with no search data → avg price = €0 → max buy = €0
   - User sees "No comparable listings found" with no indication that a provider error occurred
   - **Not yet fixed**: needs backend + frontend changes (this phase)
3. Local `.env` uses placeholder API keys → AI features don't work locally
   - **Workaround**: User must replace placeholders with real keys

## What This Phase Needs to Build

### Backend (Plan 10-01)

1. **Propagate AI errors to API responses** — When all providers fail for web search, the pricing/market-research endpoints should return a structured error payload (`dataSource: 'provider_unavailable'`) rather than silently returning zeros
2. **Add `providerStatus` to price check and market research responses** — Include which provider was used (or failed) so the frontend can show appropriate messaging
3. **Improve health endpoint** — `/api/health` already shows per-provider configuration; extend with a lightweight provider test mode (`/api/health?test_providers=1` does a single test call per provider and reports latency/error)

### Frontend (Plan 10-02)

1. **Price check error state** — When `dataSource === 'provider_unavailable'`, show a warning banner "AI search is unavailable — check server logs or API key configuration" instead of the amber "no comparable listings" box
2. **Market research error state** — Same treatment: distinguish between "searched but found nothing" vs "search provider failed"
3. **Serial checker error state** — When serial decode used no web context, show a note "Decoded without live reference data — confidence may be lower"
4. **Settings/provider hint** — Small status indicator somewhere (maybe Overview) showing AI routing mode and whether providers are responding

## Files to Change

### Backend
- `packages/server/src/services/price-check/PriceCheckService.ts` — add `providerStatus` to result type
- `packages/server/src/services/market-research/MarketResearchService.ts` — add `providerStatus` to result type
- `packages/server/src/routes/pricing.ts` — surface provider_unavailable as structured response, not silent €0
- `packages/server/src/routes/market-research.ts` — same
- `packages/server/src/server.ts` — optional: `/api/health?test_providers=1` mode
- `packages/shared/src/schemas/pricing.ts` — add `providerStatus` field to `PriceCheckResult`

### Frontend
- `src/pages/BuyBox/EvaluatorView.tsx` — handle `providerStatus: 'unavailable'` with error state
- `src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx` — same for unified evaluate page
- `src/pages/MarketResearch/MarketResearchView.tsx` — handle provider unavailable state

## Test Requirements

- Unit test: `PriceCheckService` returns `providerStatus: 'unavailable'` when both providers fail (mock AiRouter to throw)
- Unit test: pricing route returns structured `provider_unavailable` payload (not silent €0) when service signals it
- Frontend: visual smoke check confirms error state shows correct message (not €0 prices)

## Success Criteria

1. When both Perplexity and OpenAI fail for web search, price check returns `{ dataSource: 'provider_unavailable', averageSellingPriceEur: 0, providerStatus: 'unavailable' }`
2. UI shows "AI search unavailable" state (not "No comparable listings found" which implies search ran successfully but found nothing)
3. `/api/health` response clearly shows which providers are configured and which model is active
4. Tests cover the provider-unavailable path

## Dependencies

- AiRouter is already complete and has `no_provider_available` error code
- SearchService already catches errors and returns empty — just needs to propagate the failure reason
- Health endpoint already returns provider config — just needs provider test mode
