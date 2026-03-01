# Luxselle Intelligence Reference (Dynamic Router v2)

Last updated: March 1, 2026

This document is the runtime source-of-truth for AI behavior across backend services.

## 1) Global Routing Model

### Runtime env contract

| Variable | Allowed values | Notes |
|---|---|---|
| `AI_ROUTING_MODE` | `dynamic` \| `openai` \| `perplexity` | Primary runtime selector. |
| `OPENAI_API_KEY` | string (optional) | Enables OpenAI tasks (extraction/generation/vision). |
| `PERPLEXITY_API_KEY` | string (optional) | Enables Perplexity tasks (web-first retrieval and fallback extraction/generation). |
| `AI_PROVIDER` (deprecated) | `openai` \| `perplexity` \| `mock` | Compatibility only for one release; scheduled removal in next breaking cleanup. |

### Deprecation behavior (`AI_PROVIDER`)

- If `AI_ROUTING_MODE` is explicitly set, it always wins.
- If `AI_ROUTING_MODE` is unset and `AI_PROVIDER=openai|perplexity`, runtime maps to matching routing mode and logs a one-time startup warning.
- If `AI_PROVIDER=mock`, runtime ignores mock mode, uses `AI_ROUTING_MODE=dynamic`, and logs one-time startup warning.

## 2) Task Routing Matrix

Routing is implemented by `packages/server/src/services/ai/AiRouter.ts`.

| Task | Primary | Fallback | Timeout |
|---|---|---|---|
| `web_search` | Perplexity | OpenAI | 12s |
| `structured_extraction_json` | OpenAI | Perplexity | 10s |
| `freeform_generation` | OpenAI | Perplexity | 10s |
| `vision_analysis` | OpenAI | none | 10s |

### Retry/failover policy

- One retry for retryable failures (timeout, 429/5xx, network, invalid JSON/schema).
- If still failing, one fallback-provider attempt (if available).
- Per-provider/per-task health is tracked in-memory; unhealthy provider is deprioritized for 60s.

## 3) No-Fabrication Policy

Shared policy: `packages/server/src/services/ai/noFabrication.ts`

Rule:
- **Never fabricate comparables, prices, or source URLs.**

Enforcement:
- Prompt contract includes explicit no-fabrication instruction.
- Comparable sets are filtered to evidence-backed URLs only.
- Fallback outputs use empty comparables and zero/null pricing where evidence is insufficient.

## 4) Service-by-Service Runtime Behavior

## SearchService

File: `packages/server/src/services/search/SearchService.ts`

- `searchMarket/searchWeb`: routed `web_search`.
- `expandQuery`: routed structured extraction; heuristic fallback if providers fail.
- `searchAndExtract`: search + routed JSON extraction; returns `extracted: null` on enrichment failure.

Prompts: `packages/server/src/services/ai/prompts/searchPrompts.ts`

## PriceCheckService

File: `packages/server/src/services/price-check/PriceCheckService.ts`

Flow:
1. Query expansion
2. Multi-search (IE first + EU fallback)
3. Routed extraction
4. Evidence filtering (source URL required)
5. Conservative price calculation

Outputs:
- `dataSource: "web_search"` when sufficient validated comps
- `dataSource: "ai_fallback"` with empty comps/zero pricing when evidence is insufficient or extraction fails

Prompts: `priceCheckPrompts.ts`

## PricingService + Provider

Files:
- `packages/server/src/services/pricing/PricingService.ts`
- `packages/server/src/services/pricing/providers/OpenAIProvider.ts`

Notes:
- Runtime uses dynamic orchestration provider.
- IE-first market policy remains unchanged.
- Provider result can be `openai`, `perplexity`, or `hybrid`.

Prompts: `pricingPrompts.ts`

## MarketResearchService

File: `packages/server/src/services/market-research/MarketResearchService.ts`

- `analyse`, `trending`, `competitor-feed` use dynamic router.
- No runtime mock payloads.
- Degraded outputs are explicit and evidence-conservative.

Prompts: `marketResearchPrompts.ts`

## AiService (assistant endpoints)

File: `packages/server/src/services/ai/AiService.ts`

Methods routed through dynamic router:
- product description
- business insights
- prompt replies
- retail lookup (search + extraction)
- serial decode (search + extraction)

On provider failure:
- returns explicit degraded content (valid shape), not fabricated values.

Prompts: `assistantPrompts.ts`

## 5) Route-Level Availability Contract

### Explicit `503` endpoints

- `POST /api/pricing/analyse`: returns `503` when providers unavailable for core pricing analysis.
- `POST /api/pricing/analyze-image`: returns `503` when `OPENAI_API_KEY` is missing or vision processing fails.

### Explicit degraded `200` endpoints

- `POST /api/pricing/price-check`
- `POST /api/market-research/analyse`
- `GET /api/market-research/trending`
- `POST /api/ai/retail-lookup`
- `POST /api/ai/serial-decode`
- `POST /api/ai/insights`
- `POST /api/ai/prompt`

These return valid payload shapes with conservative/empty values when evidence is insufficient.

## 6) Dashboard Status Contract

`GET /api/dashboard/status` returns:

- `aiRoutingMode`
- `providerAvailability`:
  - `openai`
  - `perplexity`
  - `vision`
- `lastProviderByTask` (diagnostic)

This payload is used by frontend status badges and operational diagnostics.

## 7) Ops and Rollback

Operational override:
- `AI_ROUTING_MODE=openai` for temporary OpenAI-only mode
- `AI_ROUTING_MODE=perplexity` for temporary Perplexity-only mode

No-key behavior:
- Core pricing analysis/image endpoints return explicit `503`.
- Non-core AI endpoints return explicit degraded responses.

## 8) Testing Expectations

Minimum release gates:
- `npm run test`
- `npm run typecheck`

Key scenario coverage:
- both keys present
- Perplexity-only
- OpenAI-only
- no keys
- deprecated `AI_PROVIDER` compatibility mapping behavior
