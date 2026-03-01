# Search Enrichment Operational Guidance

This guide covers how search enrichment behaves in the backend, what can fail, and how to control fallback behavior safely.

## What “search enrichment” is

Search enrichment is the second stage in the RAG flow:

1. web search retrieves listing snippets + `sourceUrl` citations
2. enrichment extracts structured JSON from those results

If enrichment is unavailable, the API returns search results and downstream services should fall back to safe defaults (`ai_fallback` or empty extraction depending on endpoint).

## Failure modes

Common failure paths:

- **No search data**: web search returns no meaningful citations/raw text.
- **Domain blocked**: source URL is denied by denylist or not present in allowlist.
- **Extraction disabled**: global env flag disables enrichment.
- **Extraction capped**: per-minute cap reached under load.
- **Model/JSON failure**: LLM call errors or returns invalid JSON.

Expected behavior in all cases: enrichment returns `null` and callers keep serving fallback UX/data rather than hard failing.

## Environment controls

Set in backend environment (`packages/server/src/config/env.ts`):

- `SEARCH_ENRICHMENT_ENABLED` (default `true`)
  - Set `false` to fully disable enrichment globally.
- `SEARCH_ENRICHMENT_MAX_COUNT` (default `25`)
  - Max enrichment attempts per minute per server instance.
- `SEARCH_ENRICHMENT_CACHE_TTL_MS` (default `300000`)
  - TTL for in-memory `sourceUrl` domain decision cache.
- `SEARCH_DOMAIN_ALLOWLIST`
  - Comma-separated domains allowed for market extraction. If unset, defaults to:
    - `vestiairecollective.com`
    - `designerexchange.ie`
    - `luxuryexchange.ie`
    - `siopaella.com`
- `SEARCH_DOMAIN_DENYLIST`
  - Comma-separated domains always blocked (takes precedence over allowlist).

## Recommended operations playbook

### 1) Emergency disable

If extraction quality/regressions occur:

```bash
export SEARCH_ENRICHMENT_ENABLED=false
```

Restart backend. APIs continue with fallback behavior.

### 2) Load shedding

If latency spikes during peak load:

```bash
export SEARCH_ENRICHMENT_MAX_COUNT=5
```

Lower values reduce LLM extraction pressure while preserving baseline functionality.

### 3) Domain policy tuning

If a domain starts returning low-quality or unsafe data:

```bash
export SEARCH_DOMAIN_DENYLIST="bad-domain.example"
```

If new trusted marketplaces are introduced:

```bash
export SEARCH_DOMAIN_ALLOWLIST="vestiairecollective.com,designerexchange.ie,luxuryexchange.ie,siopaella.com,newmarket.example"
```

## Fallback UX expectations

When enrichment is disabled/capped/fails:

- No blocking errors should be shown for normal user flows.
- Pricing/market endpoints should return conservative fallback values or `ai_fallback` markers.
- UI should continue to render with available data and avoid “hard stop” states.

## Metrics to monitor

`SearchService` now tracks in-memory enrichment metrics:

- extraction success rate
- per-domain failure rate
- average enrichment latency (ms)

These are process-local counters useful for debugging and short-horizon operational checks.
