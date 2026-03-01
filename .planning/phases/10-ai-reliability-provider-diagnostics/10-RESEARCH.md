# Phase 10: AI Reliability + Provider Diagnostics - Research

**Researched:** 2026-03-01
**Domain:** Express backend error propagation, Zod schema extension, React error states, AI provider reliability
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Backend: propagate AI provider failures as structured `providerStatus` field in response (not HTTP 503)
- Backend: `PriceCheckResult` gets `providerStatus: 'available' | 'unavailable'` field in shared schema
- Backend: `MarketResearchResult` gets analogous provider status propagation
- Frontend: distinguish "provider failed" from "searched but found nothing" with different UI messaging
- Health endpoint: extend `/api/health?test_providers=1` for lightweight provider connectivity test
- Local `.env` setup docs updated to clarify which keys are needed and how to test connectivity

### Claude's Discretion
- Exact wording of UI error messages (within the spirit of "AI search unavailable — check API keys")
- Whether the serial checker needs a separate `providerStatus` field or uses the existing `dataSource` hint
- Whether the provider status indicator on Overview uses the existing `ServerStatusContext` or a new component
- Implementation order of plans within the phase

### Deferred Ideas (OUT OF SCOPE)
- Full provider health test mode with latency tracking per call (too heavy for this phase)
- Retry UI (let user manually re-run)
- Provider auto-recovery notifications
- Per-provider error dashboards
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| STAB-01 | AI provider failures are surfaced clearly in the UI (not silently returning €0); recoverable error states with actionable guidance shown to users. | Adding `providerStatus` to shared Zod schema + extending `PriceCheckResult.dataSource` enum to include `'provider_unavailable'` + frontend conditional rendering patterns based on this field. |
</phase_requirements>

---

## Summary

Phase 10 is a targeted reliability fix: when AI providers (OpenAI and/or Perplexity) fail, the system currently swallows the error in `SearchService.searchMarket()` and returns an empty `SearchResponse`. Downstream services (`PriceCheckService`, `MarketResearchService`) interpret empty results as "no comparables found" and return €0 prices. Users see the amber "No comparable listings found" banner and assume the search ran but found nothing — they cannot distinguish a provider failure from a genuine lack of data.

The fix requires three coordinated layers. First, the backend must propagate the failure reason: `SearchService.searchMarket()` must signal a provider failure up to callers, and `PriceCheckService.check()` and `MarketResearchService.analyse()` must capture that signal and add `providerStatus: 'unavailable'` to the response payload. Second, the shared Zod schema (`PriceCheckResultSchema`) must be extended to include this field — the `dataSource` enum can gain a third value `'provider_unavailable'`, and a separate optional `providerStatus` field can carry more detail. Third, the frontend must branch on `dataSource === 'provider_unavailable'` to show a red/orange warning banner ("AI search is unavailable — check server logs or API key configuration") instead of the existing amber "no comparable listings" box.

The codebase already has all the infrastructure needed: `AiRouter` throws `AiRouterError` with `code: 'no_provider_available'` when both providers are unconfigured or fail, `SearchService` catches that error but silences it, and the `PriceCheckDiagnostics` schema already carries an `emptyReason` field. The work is surgical: propagate rather than swallow, extend the schema, and add frontend branching.

**Primary recommendation:** Extend `PriceCheckResult.dataSource` to include `'provider_unavailable'` (already in enum position), propagate this from `SearchService` → `PriceCheckService` → route → frontend, and render a distinct recoverable error state that replaces the current "no comparable listings" amber box.

---

## Standard Stack

### Core (no new dependencies needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | Already installed (`@luxselle/shared`) | Schema extension for `providerStatus` field | Project standard for all schemas |
| Express | Already installed | Route-level error handling | Project standard |
| React | Already installed | Conditional UI rendering | Project standard |
| Vitest | Already installed (`config/vitest.config.ts`) | Unit tests for new behaviour | Project standard |
| Supertest | Already installed | Route integration tests | Project standard per CLAUDE.md |

### No New Packages Required

All needed tools are already installed. This is a code-path change, not a new dependency.

**Installation:**
```bash
# No new packages required
```

---

## Architecture Patterns

### Recommended File Changes

```
packages/shared/src/schemas/
└── pricing.ts               # Extend PriceCheckResultSchema (dataSource + providerStatus)

packages/server/src/services/
├── search/SearchService.ts  # searchMarket() — expose failure reason instead of swallowing
├── price-check/
│   ├── PriceCheckService.ts     # Capture search failure, set dataSource='provider_unavailable'
│   └── PriceCheckService.test.ts  # New test: both providers fail -> providerStatus=unavailable
└── market-research/
    ├── MarketResearchService.ts   # buildDegradedAnalysis() gains providerStatus='unavailable'
    └── MarketResearchService.test.ts

packages/server/src/routes/
├── pricing.ts               # price-check route: pass through providerStatus transparently
├── market-research.ts       # analyse route: pass through providerStatus transparently
└── pricing.test.ts          # Route test: provider_unavailable payload returned (not 503)

packages/server/src/server.ts  # /api/health?test_providers=1 optional mode

src/pages/
├── UnifiedIntelligence/UnifiedIntelligenceView.tsx  # Branch on provider_unavailable
├── BuyBox/EvaluatorView.tsx                          # Branch on provider_unavailable
└── MarketResearch/MarketResearchView.tsx             # Branch on provider_unavailable
```

### Pattern 1: SearchService Error Signal

**What:** Instead of returning empty `SearchResponse` on failure, add a `providerError` flag to `SearchResponse` so callers can distinguish "searched but found nothing" from "search could not run."

**When to use:** Whenever `SearchService.searchMarket()` catches an error from `AiRouter`.

**Example:**
```typescript
// packages/server/src/services/search/SearchService.ts
export interface SearchResponse {
  results: SearchResult[]
  rawText: string
  annotations: Array<{ url: string; title: string }>
  providerError?: boolean  // NEW: true when provider threw, not when search ran clean
}

// In searchMarket():
} catch (error) {
  logger.error('search_service_error', error)
  return { results: [], rawText: '', annotations: [], providerError: true }
}
```

### Pattern 2: PriceCheckResult Schema Extension

**What:** Extend the shared `PriceCheckResultSchema` to accept `'provider_unavailable'` as a `dataSource` value. The `diagnostics.emptyReason` already carries `'no_search_data'` — this extends the same idea to the top-level `dataSource` field.

**When to use:** When `PriceCheckService.check()` detects that `searchMarket()` returned `providerError: true` before extraction was even attempted.

**Example:**
```typescript
// packages/shared/src/schemas/pricing.ts
export const PriceCheckResultSchema = z.object({
  averageSellingPriceEur: z.number(),
  comps: z.array(PriceCheckCompSchema),
  maxBuyEur: z.number(),
  maxBidEur: z.number(),
  dataSource: z.enum(['web_search', 'ai_fallback', 'provider_unavailable']), // extend enum
  researchedAt: z.string(),
  diagnostics: PriceCheckDiagnosticsSchema.optional(),
})
```

### Pattern 3: PriceCheckService Provider Failure Path

**What:** Early-exit path in `PriceCheckService.check()` when all parallel `searchMarket()` calls returned `providerError: true`.

**When to use:** After `searchMarketMultiExpanded()` completes and all responses have `providerError: true`.

**Example:**
```typescript
// packages/server/src/services/price-check/PriceCheckService.ts
// After getting searchResponse:
const allProviderFailed = searchResponse.providerError === true

if (allProviderFailed) {
  return {
    averageSellingPriceEur: 0,
    comps: [],
    maxBuyEur: 0,
    maxBidEur: 0,
    dataSource: 'provider_unavailable',
    researchedAt: new Date().toISOString(),
    diagnostics: this.buildDiagnostics(searchResponse, queryContext, 'no_search_data', {
      strategyUsed,
      extractedCompCount: 0,
      validCompCount: 0,
      filteredOutCount: 0,
    }),
  }
}
```

### Pattern 4: Frontend Provider Unavailable Banner

**What:** A third branch in the `dataSource` conditional, distinct from the existing `ai_fallback` amber box. Uses a red/orange banner colour and actionable copy.

**When to use:** When `result.dataSource === 'provider_unavailable'`.

**Example:**
```tsx
// In UnifiedIntelligenceView.tsx and EvaluatorView.tsx
{result.dataSource === 'web_search' ? (
  <span className="...text-emerald-700...">Live data</span>
) : result.dataSource === 'ai_fallback' ? (
  <span className="...text-amber-700...">AI estimate</span>
) : result.dataSource === 'provider_unavailable' ? (
  <span className="...text-red-700...">AI unavailable</span>
) : null}

// And in the comps area:
{result.dataSource === 'provider_unavailable' ? (
  <div className="rounded-lux-card border border-red-200 bg-red-50/50 p-5 text-sm text-red-800">
    <span className="font-medium">AI search is unavailable.</span>{' '}
    Check that OPENAI_API_KEY and/or PERPLEXITY_API_KEY are configured on the server, then retry.
  </div>
) : result.comps.length > 0 ? (
  // ... existing comps list
) : (
  <div className="...amber...">No comparable listings found. Prices shown are AI estimates...</div>
)}
```

### Pattern 5: MarketResearchService Provider Status

**What:** `MarketResearchService.buildDegradedAnalysis()` already exists and returns `confidence: 0.15`. Adding a `providerStatus: 'unavailable'` field to `MarketResearchResult` allows the frontend to distinguish "searched but degraded" from "provider never ran."

**When to use:** When `searchMarketMultiExpanded()` returns all providerError responses.

**Note:** `MarketResearchResult` is defined only in the server (not in shared schemas), so the field addition stays server-side. The route returns it in `data` and the frontend reads it.

### Pattern 6: Health Endpoint Test Mode

**What:** `/api/health?test_providers=1` makes a minimal test call per configured provider and reports latency/error. The existing `/api/health` already reports key presence. Test mode adds live connectivity check.

**When to use:** Operator wants to verify keys work, not just that they are present.

**Example:**
```typescript
// packages/server/src/server.ts
app.get('/api/health', async (req, res) => {
  const openaiConfigured = Boolean(env.OPENAI_API_KEY)
  const perplexityConfigured = Boolean(env.PERPLEXITY_API_KEY)

  const baseResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiConfigured: openaiConfigured || perplexityConfigured,
    ai: {
      routingMode: env.AI_ROUTING_MODE,
      providers: { openai: openaiConfigured, perplexity: perplexityConfigured },
      searchModel: env.PERPLEXITY_SEARCH_MODEL,
    },
  }

  if (req.query.test_providers !== '1') {
    res.json(baseResponse)
    return
  }

  // Lightweight test: minimal prompt to each configured provider
  const router = getAiRouter()
  const testResults: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {}

  if (openaiConfigured) {
    const t = Date.now()
    try {
      await router.generateText({ userPrompt: 'ping', maxTokens: 1 })
      testResults.openai = { ok: true, latencyMs: Date.now() - t }
    } catch (e) {
      testResults.openai = { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  if (perplexityConfigured) {
    const t = Date.now()
    try {
      await router.generateText({ userPrompt: 'ping', maxTokens: 1 })
      testResults.perplexity = { ok: true, latencyMs: Date.now() - t }
    } catch (e) {
      testResults.perplexity = { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  res.json({ ...baseResponse, providerTests: testResults })
})
```

### Anti-Patterns to Avoid

- **Returning HTTP 503 for provider failures in price-check:** The existing approach for unconfigured keys uses 503, but for runtime provider failures the better approach is a structured 200 payload with `dataSource: 'provider_unavailable'` — this is more frontend-friendly and allows result caching.
- **Changing existing `dataSource` values:** `'web_search'` and `'ai_fallback'` are used in tests and frontend. Adding `'provider_unavailable'` as a third value is safe; renaming existing values would break things.
- **Propagating `providerError` too early:** Only set `providerError: true` when the provider itself threw; not when the search ran but returned no results. The distinction matters for UI messaging.
- **Making health test_providers synchronous and slow:** The test mode uses the existing `generateText` method with `maxTokens: 1`. Keep it minimal to avoid blocking the health check path.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema extension | Custom validation layer | Zod `.extend()` or add optional field to existing schema | Zod is already the schema layer; adding a field is trivial and safe |
| Provider error detection | Parse error message strings | Check `AiRouterError.code === 'no_provider_available'` | `AiRouter` already uses typed error codes |
| Frontend error UI | Custom error component library | Tailwind inline classes matching existing `border-amber-*` pattern | Consistency with existing `No comparable listings found` box styling |
| Test mocking | New mock infrastructure | `vi.hoisted()` + `vi.mock('../ai/AiRouter')` | Already used in `PriceCheckService.test.ts` |

**Key insight:** The `AiRouter` already exposes `code: 'no_provider_available'` on its errors. All the detection logic is already there. The work is propagating it upward through `SearchService` → `PriceCheckService` → route, not rebuilding detection.

---

## Common Pitfalls

### Pitfall 1: searchMarketMulti Parallel Calls Mask Individual Errors

**What goes wrong:** `searchMarketMultiExpanded()` calls `searchMarket()` multiple times with `Promise.all()`. Each call catches its own error and returns `{ results: [], rawText: '', annotations: [] }`. The merged result looks like empty-but-clean, not like a failure.

**Why it happens:** `SearchService.searchMarket()` catches errors and returns an empty response. `searchMarketMultiExpanded()` has no visibility into whether each sub-call succeeded or failed.

**How to avoid:** Add `providerError: boolean` to `SearchResponse`. Merge logic in `searchMarketMultiExpanded()` should set `providerError: true` on the merged result if ALL sub-responses had `providerError: true` (not if just one did — partial failures may still yield usable data).

**Warning signs:** All sub-searches return empty annotations AND empty rawText — this is the fingerprint of all providers failing.

### Pitfall 2: Extending Zod Enum Breaks Existing Tests

**What goes wrong:** `PriceCheckResultSchema.dataSource` is `z.enum(['web_search', 'ai_fallback'])`. Adding `'provider_unavailable'` extends the enum. Existing test fixtures that use `dataSource: 'ai_fallback'` continue to pass. Tests that check `expect(result.dataSource).toBe('ai_fallback')` are unaffected. Risk: if any test asserts the full schema shape and the real service now returns `'provider_unavailable'`, it needs updating.

**Why it happens:** Zod enum extension is additive and safe, but test expectations against exact values need review.

**How to avoid:** Run `npm test` after schema extension. Update tests in `PriceCheckService.test.ts` and `pricing.test.ts` that assert `dataSource` to cover the new value.

**Warning signs:** Tests checking `z.enum(['web_search', 'ai_fallback'])` type assertions will catch invalid values at compile time.

### Pitfall 3: MarketResearchResult Not in Shared Schema

**What goes wrong:** Unlike `PriceCheckResult`, `MarketResearchResult` is defined in `packages/server/src/services/market-research/MarketResearchService.ts` as a TypeScript interface, not a shared Zod schema. Adding `providerStatus` only requires changing this interface and the service's `buildDegradedAnalysis()` — but the frontend also needs to know the field exists.

**Why it happens:** Market research was not added to `packages/shared/src/schemas/` — only `PriceCheckResult` lives there.

**How to avoid:** Add `providerStatus?: 'available' | 'unavailable'` to `MarketResearchResult` (server type) and use the same string value in the frontend's `MarketResearchView.tsx`. No shared schema change needed — the frontend already reads this via the API response shape.

**Warning signs:** TypeScript will not catch mismatches if the frontend uses `data.providerStatus` without a type definition.

### Pitfall 4: Health Test Mode Fires AI Calls on Every Health Check

**What goes wrong:** If something poll `/api/health` frequently (monitoring tools), and `test_providers=1` is included, it makes real AI API calls and incurs cost/latency.

**Why it happens:** The test_providers flag makes live calls.

**How to avoid:** Only activate when `?test_providers=1` is explicitly passed. Default `/api/health` remains static key-presence check. Document clearly in `.env.example` that this flag is for debugging, not monitoring.

### Pitfall 5: Silent searchMarket() in searchMarketMultiExpanded() Always Returns Success Shape

**What goes wrong:** `searchMarketMultiExpanded()` currently uses `Promise.all()` and never throws. It returns a merged `SearchResponse` with empty arrays if all sub-searches failed. There is no way for `PriceCheckService` to know all searches failed versus found nothing.

**Why it happens:** Error swallowing in `searchMarket()` is intentional defensive code — it prevents a single search lane failure from crashing the whole pipeline. But it over-swallows.

**How to avoid:** The partial-failure design (some providers failed, some succeeded) should continue to work. Only propagate `providerError: true` when ALL parallel calls returned `providerError: true`. If at least one call returned non-empty results, treat it as success.

---

## Code Examples

### Adding providerError to SearchResponse

```typescript
// packages/server/src/services/search/SearchService.ts
// Source: existing code with minimal addition

export interface SearchResponse {
  results: SearchResult[]
  rawText: string
  annotations: Array<{ url: string; title: string }>
  providerError?: boolean  // true only when provider threw, not when search returned empty
}

// searchMarket() catch block:
} catch (error) {
  logger.error('search_service_error', error)
  return { results: [], rawText: '', annotations: [], providerError: true }
}

// searchMarketMultiExpanded() merge:
const allFailed = responses.every((r) => r.providerError === true)
// ... existing merge logic ...
return { results, rawText, annotations, providerError: allFailed || undefined }
```

### PriceCheckService Early Exit

```typescript
// packages/server/src/services/price-check/PriceCheckService.ts
// After searchResponse = await this.searchService.searchMarketMultiExpanded(...)

if (searchResponse.providerError) {
  const maxBuyEur = 0
  const maxBidEur = 0
  return {
    averageSellingPriceEur: 0,
    comps: [],
    maxBuyEur,
    maxBidEur,
    dataSource: 'provider_unavailable' as const,
    researchedAt: new Date().toISOString(),
    diagnostics: this.buildDiagnostics(searchResponse, queryContext, 'no_search_data', {
      strategyUsed,
      extractedCompCount: 0,
      validCompCount: 0,
      filteredOutCount: 0,
    }),
  }
}
```

### PriceCheckResult Schema Extension

```typescript
// packages/shared/src/schemas/pricing.ts
export const PriceCheckResultSchema = z.object({
  averageSellingPriceEur: z.number(),
  comps: z.array(PriceCheckCompSchema),
  maxBuyEur: z.number(),
  maxBidEur: z.number(),
  dataSource: z.enum(['web_search', 'ai_fallback', 'provider_unavailable']),  // extend
  researchedAt: z.string(),
  diagnostics: PriceCheckDiagnosticsSchema.optional(),
})
```

### Frontend Provider Unavailable Branch (Unified Intelligence)

```tsx
// src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx
// Replace the existing comps-empty amber box with a 3-way branch:

{result.dataSource === 'provider_unavailable' ? (
  <div className="rounded-lux-card border border-red-200 bg-red-50/50 p-5 text-sm text-red-800">
    <p className="font-medium">AI search unavailable</p>
    <p className="mt-1 text-red-700">
      Check that OPENAI_API_KEY and/or PERPLEXITY_API_KEY are configured, then retry.
    </p>
  </div>
) : result.comps.length > 0 ? (
  // existing comps list
) : (
  <div className="rounded-lux-card border border-amber-200 bg-amber-50/50 p-5 text-sm text-amber-800">
    No comparable listings found. Prices shown are AI estimates and may be less reliable.
  </div>
)}
```

### Unit Test: PriceCheckService Returns provider_unavailable

```typescript
// packages/server/src/services/price-check/PriceCheckService.test.ts
// New test to add:

it('returns provider_unavailable when all search providers fail', async () => {
  mockSearchMarketMultiExpanded.mockResolvedValue({
    results: [],
    rawText: '',
    annotations: [],
    providerError: true,
  })

  const service = new PriceCheckService()
  const result = await service.check({ query: 'Chanel Classic Flap' })

  expect(result.dataSource).toBe('provider_unavailable')
  expect(result.averageSellingPriceEur).toBe(0)
  expect(result.maxBuyEur).toBe(0)
  expect(result.maxBidEur).toBe(0)
  expect(result.comps).toEqual([])
  expect(mockExtractStructuredJson).not.toHaveBeenCalled()
})
```

### Unit Test: Pricing Route Returns provider_unavailable Payload

```typescript
// packages/server/src/routes/pricing.test.ts
// New test to add:

it('returns 200 with provider_unavailable dataSource when service signals it', async () => {
  mockCheck.mockResolvedValue({
    averageSellingPriceEur: 0,
    comps: [],
    maxBuyEur: 0,
    maxBidEur: 0,
    dataSource: 'provider_unavailable',
    researchedAt: new Date().toISOString(),
  })

  const res = await request(app)
    .post('/api/pricing/price-check')
    .send({ query: 'Chanel Classic Flap' })

  expect(res.status).toBe(200)
  expect(res.body.data.dataSource).toBe('provider_unavailable')
  expect(res.body.data.averageSellingPriceEur).toBe(0)
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single AiService with OpenAI only | AiRouter with dynamic provider routing (OpenAI + Perplexity) | Post-Phase 9 | Multiple providers now configured; failure modes more complex |
| `sonar-pro` default Perplexity model | `sonar` default | 2026-03-01 hotfix | Fixes 402/403 on standard Perplexity plans |
| Silent empty SearchResponse on failure | (PLANNED) providerError flag propagation | Phase 10 | Enables frontend to distinguish failure from empty search |
| 503 for AI unavailable (pricing/analyse route) | (PLANNED) 200 with `dataSource: 'provider_unavailable'` for price-check | Phase 10 | Consistent structured error payload vs HTTP error |

**Note on existing 503 pattern:** The `pricing.ts` route already uses `isAiUnavailableError()` check to return 503 for the `/analyse` route. For the `/price-check` route, the new approach returns a structured 200 payload (not 503) because `PriceCheckService.check()` is designed to always return a `PriceCheckResult` — it never throws. This is the correct pattern to follow for the price-check case.

---

## Open Questions

1. **Should `searchMarketMultiExpanded` propagate providerError when SOME (not all) parallel searches fail?**
   - What we know: 3 parallel searches run; if Perplexity fails but OpenAI succeeds on one lane, the merged result has partial data.
   - What's unclear: Should partial data be treated as success or partial failure?
   - Recommendation: Only set `providerError: true` when ALL parallel calls returned providerError. Partial success = treat as success (with potentially fewer results).

2. **Does `MarketResearchResult` need a shared Zod schema?**
   - What we know: It's a TypeScript interface in the server only. The frontend reads it but has no type for the API response.
   - What's unclear: Whether adding `providerStatus` to an untyped API response will cause TypeScript errors on the frontend.
   - Recommendation: Add `providerStatus?: 'available' | 'unavailable'` to the server's `MarketResearchResult` interface and add a matching optional read in the frontend component. No shared schema migration required for this phase.

3. **Health endpoint: Should `test_providers=1` actually fire a `generateText` call through AiRouter?**
   - What we know: AiRouter's `generateText` with `maxTokens: 1` is the cheapest call. The CONTEXT.md says "lightweight provider test."
   - What's unclear: Whether Perplexity's API supports `maxTokens: 1` without error.
   - Recommendation: Use `maxTokens: 5` to be safe with Perplexity's minimum token constraints. This costs ~$0.00001 per test call.

---

## Validation Architecture

> `workflow.nyquist_validation` not present in `.planning/config.json` — using standard test coverage approach.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (config at `config/vitest.config.ts`) |
| Config file | `config/vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| STAB-01 | PriceCheckService returns `dataSource: 'provider_unavailable'` when all search providers fail | unit | `npm test -- --reporter=verbose PriceCheckService` | ❌ Wave 0 — new test case |
| STAB-01 | Pricing route returns 200 with `dataSource: 'provider_unavailable'` structured payload (not 503) | integration | `npm test -- --reporter=verbose pricing.test` | ❌ Wave 0 — new test case |
| STAB-01 | MarketResearchService buildDegradedAnalysis sets providerStatus='unavailable' when provider fails | unit | `npm test -- --reporter=verbose MarketResearchService` | ❌ Wave 0 — new test case |
| STAB-01 | Existing tests continue passing after schema enum extension | regression | `npm test` | ✅ Existing suite |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] New test case in `packages/server/src/services/price-check/PriceCheckService.test.ts` — "provider_unavailable when all providers fail"
- [ ] New test case in `packages/server/src/routes/pricing.test.ts` — "200 with provider_unavailable dataSource"
- [ ] New test case in `packages/server/src/services/market-research/MarketResearchService.test.ts` — "buildDegradedAnalysis returns providerStatus unavailable"

---

## Sources

### Primary (HIGH confidence)
- Direct source code inspection — `AiRouter.ts`, `SearchService.ts`, `PriceCheckService.ts`, `MarketResearchService.ts`, `pricing.ts`, `market-research.ts`, `server.ts`, `pricing.ts` (shared schema)
- `PriceCheckService.test.ts`, `MarketResearchService.test.ts`, `pricing.test.ts`, `market-research.test.ts` — existing test patterns verified
- `.planning/phases/10-ai-reliability-provider-diagnostics/10-CONTEXT.md` — user decisions
- `packages/shared/src/schemas/pricing.ts` — current schema shape verified

### Secondary (MEDIUM confidence)
- `STATE.md` and `REQUIREMENTS.md` — project history and requirement traceability

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all patterns verified in existing code
- Architecture: HIGH — propagation path verified by reading actual source; schema change is additive
- Pitfalls: HIGH — identified by reading actual catch blocks and parallel search merge logic
- Test patterns: HIGH — gen-test SKILL.md + existing test files confirm Vitest + `vi.hoisted()` + Supertest patterns

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable internal codebase; 30-day window)
