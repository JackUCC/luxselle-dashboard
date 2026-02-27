# Luxselle Intelligence Reference

Complete documentation of every AI-powered function, its routing conditions, prompts, formulas, and data flow.

---

## Table of Contents

1. [Global Conditions (Provider Selection)](#1-global-conditions-provider-selection)
2. [SearchService (Web Search Layer)](#2-searchservice-web-search-layer)
3. [Market Research](#3-market-research)
4. [Price Check / Buy Box](#4-price-check--buy-box)
5. [Pricing Analysis (Evaluator)](#5-pricing-analysis-evaluator)
6. [Image Analysis](#6-image-analysis)
7. [Retail Price Lookup](#7-retail-price-lookup)
8. [Serial Checker](#8-serial-checker)
9. [Serial Valuation (Pricing Guidance)](#9-serial-valuation-pricing-guidance)
10. [Landed Cost Calculator](#10-landed-cost-calculator)
11. [Auction Landed Cost (Backend)](#11-auction-landed-cost-backend)
12. [Business Insights](#12-business-insights)
13. [Product Description Generator](#13-product-description-generator)
14. [Dashboard Prompt Bar](#14-dashboard-prompt-bar)

---

## 1. Global Conditions (Provider Selection)

**File:** `packages/server/src/config/env.ts`

Every AI function checks two environment variables before deciding which path to take:

| Variable | Values | Default |
|---|---|---|
| `AI_PROVIDER` | `'mock'` or `'openai'` | `'mock'` |
| `OPENAI_API_KEY` | any string | undefined |
| `TARGET_MARGIN_PCT` | number | `35` |

**The universal gate condition used across all services:**

```
if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
    // Use real OpenAI API (with web search where applicable)
} else {
    // Return hardcoded mock data
}
```

Every function falls back to mock data if either condition fails. The mock path never makes external API calls.

---

## 2. SearchService (Web Search Layer)

**File:** `packages/server/src/services/search/SearchService.ts`

The SearchService wraps OpenAI's Responses API with the `web_search` tool. It is the foundation of the RAG (Retrieval-Augmented Generation) pipeline.

### Methods

#### `searchMarket(query, opts?)` -- Scoped market search

**Gate condition:** `env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY` returns empty.

**API call:**
```
openai.responses.create({
    model: 'gpt-4o-mini',
    tools: [{
        type: 'web_search',
        search_context_size: 'medium',
        user_location: { type: 'approximate', country: opts.userLocation.country }
    }],
    input: query
})
```

**Approved domains (hardcoded):**
- `vestiairecollective.com`
- `designerexchange.ie`
- `luxuryexchange.ie`
- `siopaella.com`

**Returns:** `{ results: SearchResult[], rawText: string, annotations: Array<{url, title}> }`

**Annotation extraction logic:** Iterates `response.output` items, looking for `item.type === 'message'` -> `block.type === 'output_text'` -> `ann.type === 'url_citation'`.

#### `searchWeb(query)` -- General web search (no domain restriction)

Same as `searchMarket` but without domain filtering or user location. Used for retail price lookups and serial code reference.

#### `searchAndExtract<T>(opts)` -- Full RAG pipeline

1. Calls `searchMarket(...)` to retrieve live results.
2. If results are non-empty, passes them to `gpt-4o-mini` via Chat Completions with a system prompt: *"You extract structured data from web search results. Return ONLY valid JSON, no markdown."*
3. Parses JSON from the response using regex: `text.match(/\{[\s\S]*\}/)`
4. Returns `{ extracted: T | null, searchResponse }`.

---

## 3. Market Research

**File:** `packages/server/src/services/market-research/MarketResearchService.ts`
**Route:** `POST /api/market-research/analyse`

### Flow

```
analyse(input)
  |
  |-- if AI_PROVIDER=openai && OPENAI_API_KEY:
  |     |
  |     |-- analyseWithRAG(input)
  |     |     |
  |     |     |-- Build search query: "{brand} {model} {colour?} {category?} price second-hand pre-owned for sale EUR"
  |     |     |-- searchService.searchMarket(query, { userLocation: { country: 'IE' } })
  |     |     |
  |     |     |-- if rawText.length > 50 OR results.length > 0:
  |     |     |     |-- synthesizeFromSearch(input, searchResponse)  [RAG path]
  |     |     |
  |     |     |-- else:
  |     |           |-- analyseWithOpenAIFallback(input)  [pure AI path]
  |
  |-- else:
        |-- mockAnalysis(input)  [static mock data]
```

### RAG Extraction Prompt (synthesizeFromSearch)

**Model:** `gpt-4o-mini` | **Temperature:** `0.2` | **Max tokens:** `2000`

**System message:** *"You are a luxury market analyst. Extract structured market intelligence from web search results. Return ONLY valid JSON."*

**User prompt structure:**
```
You are a luxury goods market research analyst specializing in the European resale market (Ireland and EU).

You have been provided REAL web search results below. Use ONLY the data from these search results to form your analysis. Do NOT invent listings or prices that are not supported by the search data.

=== WEB SEARCH RESULTS ===
{rawText from web search}

Source URLs:
- {title}: {url}
...
=== END SEARCH RESULTS ===

Item to analyse:
Brand: {brand}
Model: {model}
Category: {category}
Condition: {condition}
Colour: {colour}  (if provided)
Year: {year}  (if provided)
Notes: {notes}  (if provided)
Current Asking Price: {currentAskPriceEur}  (if provided)

Return ONLY a valid JSON object: { estimatedMarketValueEur, priceRangeLowEur, priceRangeHighEur, suggestedBuyPriceEur, suggestedSellPriceEur, demandLevel, priceTrend, marketLiquidity, recommendation, confidence, marketSummary, keyInsights, riskFactors, comparables, seasonalNotes }
```

**Key rules in the prompt:**
- comparables MUST come from the search results with real titles, prices, URLs
- GBP conversion: 1 GBP = 1.17 EUR; USD conversion: 1 USD = 0.92 EUR
- If fewer than 3 comparables found, confidence must be below 0.5
- `suggestedBuyPriceEur = estimatedMarketValueEur * 0.65` (35% margin)

### Fallback Prompt (analyseWithOpenAIFallback)

**Model:** `gpt-4o-mini` | **Temperature:** `0.3` | **Max tokens:** `2000`

Used when web search returns no results. Same JSON structure but without the search context block. Relies entirely on the model's training data.

### Provider tag

- `'openai+web_search'` when RAG path was used
- `'openai'` when fallback was used
- `'mock'` when mock path was used

---

## 4. Price Check / Buy Box

**File:** `packages/server/src/routes/pricing.ts`
**Route:** `POST /api/pricing/price-check`

### Input validation (Zod)

```
query: string (min 1 char)
condition: string (optional, default '')
notes: string (optional, default '')
```

### Flow

```
price-check(query, condition, notes)
  |
  |-- if AI_PROVIDER=openai && OPENAI_API_KEY:
  |     |-- Build search query: "{query} {condition}. {notes} price second-hand pre-owned for sale EUR"
  |     |-- searchService.searchMarket(searchQuery, { userLocation: { country: 'IE' } })
  |     |-- Determine hasSearchData: rawText.length > 50 OR results.length > 0
  |     |-- Send extraction prompt to gpt-4o-mini (temp 0.2, max_tokens 800)
  |     |-- Parse JSON -> averageSellingPriceEur, comps[]
  |     |-- dataSource = hasSearchData ? 'web_search' : 'ai_fallback'
  |
  |-- else (mock):
        |-- averageSellingPriceEur = 1200
        |-- 2 hardcoded comps
        |-- dataSource = 'mock'
```

### Extraction Prompt

**System message:** *"Extract structured pricing data from web search results. Return ONLY valid JSON."*

**User prompt:**
```
You are a luxury resale pricing expert. Using ONLY the web search results provided below, extract real listing data.

Item: "{query}"
Condition/notes: {condition}. {notes}

=== WEB SEARCH RESULTS ===
{rawText or "(No live results found)"}

Source URLs:
- {title}: {url}
=== END SEARCH RESULTS ===

Return ONLY a JSON object:
{ "averageSellingPriceEur": <number>, "comps": [{ "title", "price", "source", "sourceUrl" }] }

Rules:
- Extract 3-6 real comparable listings with actual prices and URLs
- averageSellingPriceEur must be calculated from the real prices found
- GBP conversion: 1 GBP = 1.17 EUR
- If no real listings found, return averageSellingPriceEur: 0 and empty comps
```

### Formulas (applied after AI extraction)

```
Max Buy = Math.round((averageSellingPriceEur / 1.23) * 0.8)
Max Bid = Math.round(maxBuyEur / 1.07)
```

| Formula | Meaning |
|---|---|
| `/ 1.23` | Remove 23% Irish VAT |
| `* 0.8` | Keep 20% margin (pay max 80% of ex-VAT price) |
| `/ 1.07` | Adjust for 7% auction buyer's premium |

### Response

```json
{
  "data": {
    "averageSellingPriceEur": 5200,
    "comps": [...],
    "maxBuyEur": 3382,
    "maxBidEur": 3161,
    "dataSource": "web_search"
  }
}
```

---

## 5. Pricing Analysis (Evaluator)

**File:** `packages/server/src/services/pricing/PricingService.ts` + `providers/OpenAIProvider.ts`
**Route:** `POST /api/pricing/analyse`

### Provider Selection (PricingService constructor)

```
if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) -> OpenAIProvider
else -> MockPricingProvider
```

### OpenAIProvider RAG Flow

```
analyse(input)
  |-- Build search query: "{brand} {model} {colour} {category} price second-hand pre-owned for sale EUR"
  |-- searchService.searchMarket(query, { userLocation: { country: marketCountry } })
  |-- hasSearchData = rawText.length > 50 OR results.length > 0
  |-- Build prompt with live search context (or fallback note)
  |-- gpt-4o-mini, temp 0.2, max_tokens 800
  |-- Parse JSON -> estimatedRetailEur, confidence, comps[]
```

### PricingService.analyse() orchestration

```
1. Get provider result (estimatedRetailEur, confidence, comps)
2. Apply IE-first market policy (filter/sort comparables by Irish sources)
3. Calculate max buy price:
   maxBuyPriceEur = Math.round(estimatedRetailEur * (1 - TARGET_MARGIN_PCT / 100))
   (default: estimatedRetailEur * 0.65)
4. Query historical average from transaction database
5. Save evaluation to Firestore
```

### IE-First Market Policy

Comparables are classified as IE or EU based on source domain matching against an allowlist:
- Default allowlist: `designerexchange.ie`, `luxuryexchange.ie`, `siopaella.com`, `vestiairecollective.com`
- If 2+ IE comps exist, only IE comps are used
- If fewer than 2 IE comps, EU fallback fills remaining slots (up to 4 total)

---

## 6. Image Analysis

**File:** `packages/server/src/routes/pricing.ts`
**Route:** `POST /api/pricing/analyze-image`

### Flow

```
analyze-image(file)
  |-- Validate: file must exist, mimetype starts with 'image/'
  |-- Max file size: 10MB
  |-- Convert to base64
  |
  |-- if AI_PROVIDER=openai && OPENAI_API_KEY:
  |     |-- gpt-4o (Vision API)
  |     |-- Prompt: "Analyze this luxury product image and extract brand, model, category, condition, and color."
  |     |-- Returns JSON: { brand, model, category, condition, colour }
  |     |-- max_tokens: 300
  |
  |-- else (mock):
        |-- Returns empty strings for all attributes
```

**Output:** Detected attributes plus a concatenated `query` string (e.g. `"Chanel Classic Flap Black"`) for the Price Check search bar.

---

## 7. Retail Price Lookup

**File:** `packages/server/src/services/ai/AiService.ts`
**Route:** `POST /api/ai/retail-lookup`

### Flow

```
getRetailPriceFromDescription(description)
  |
  |-- if AI_PROVIDER !== 'openai' || !OPENAI_API_KEY -> mockRetailPrice(description)
  |-- if description is empty -> return null with guidance message
  |
  |-- Step 1: Web search
  |     searchService.searchWeb("{description} official retail price EUR new boutique")
  |     hasSearchData = rawText.length > 50
  |
  |-- Step 2: AI extraction
  |     gpt-4o-mini, temp 0.2, max_tokens 300
  |     System: "Extract official retail pricing from web search results. Return ONLY valid JSON."
```

### Prompt

```
You are a luxury retail expert. Given the following item description, find the CURRENT OFFICIAL RETAIL PRICE -- what the brand sells this item for NEW, directly from the brand (boutique or official website), NOT second-hand or resale market prices.

{if hasSearchData: === WEB SEARCH RESULTS === ... === END ===}

Item description:
"""
{description}
"""

Return ONLY a valid JSON object:
- "retailPriceEur": number or null
- "currency": "EUR"
- "productName": string or null
- "note": string (cite source URL if from web search)

{if hasSearchData: "Use the web search results above to find the real current retail price. Cite the source URL in the note."}
{else: "No web results available -- estimate based on your knowledge and flag as approximate in the note."}
```

### Mock Fallback

Pattern-matches description text:
- Contains "chanel" + ("flap" or "classic") -> 6,500 EUR
- Contains "louis vuitton" or "lv" -> 1,800 EUR
- Otherwise -> null

---

## 8. Serial Checker

Two layers work together: a **frontend rule-based decoder** and a **backend AI heuristic decoder**.

### Layer 1: Rule-Based Decoder (Frontend)

**File:** `src/lib/serialDateDecoder.ts`

Runs entirely client-side with no API calls. Supported brands:

#### Louis Vuitton

| Format | Era | Pattern | Decode Logic |
|---|---|---|---|
| 2 letters + 4 digits | 2007-2021 | `/^[A-Z]{2}\d{4}$/` | Digits 1+3 = week (1-53), digits 2+4 = year. Confidence: 0.95 |
| 2 letters + 4 digits | 1990-2006 | Same pattern | Digits 1+3 = month (1-12), digits 2+4 = year. Confidence: 0.92 |
| 3-4 digits | 1980s | All digits | First 2 digits = year (82-89), last digit = month (1-9). Confidence: 0.85 |

Priority: If 1990-2006 interpretation is valid, it takes priority over 2007+ interpretation.

#### Chanel

| Format | Era | Pattern | Decode Logic |
|---|---|---|---|
| 8 digits | 2005-2022 | Exactly 8 digits | First 2 digits = prefix (10-32) mapped to year windows via lookup table. Confidence: 0.80-0.88 |
| 7 digits | 1986-2005 | Exactly 7 digits | First digit (0-9) mapped to year windows via lookup table. Confidence: 0.75-0.84 |

#### Other Brands

Returns failure with guidance: *"We don't have a date decoder for this brand yet."*

### Layer 2: AI Heuristic Decoder (Backend)

**File:** `packages/server/src/services/ai/AiService.ts`
**Route:** `POST /api/ai/serial-decode`

Called when the rule-based decoder returns low confidence (< 0.7) or `precision === 'unknown'`.

### Flow

```
decodeSerialHeuristic(input)
  |-- Normalize serial: strip spaces, uppercase
  |-- if empty -> return failure
  |-- if AI_PROVIDER !== 'openai' -> mockSerialDecodeHeuristic
  |
  |-- Step 1: Web search for brand serial reference
  |     searchService.searchWeb("{brand} serial number date code format guide authentication")
  |     hasSearchData = rawText.length > 50
  |
  |-- Step 2: AI decode with reference context
  |     gpt-4o-mini, temp 0.2, max_tokens 600
  |     System: "You decode luxury goods serial numbers using reference data. Return ONLY valid JSON."
```

### AI Decode Prompt

```
You are a luxury authentication assistant focused on serial/date code interpretation.

=== WEB SEARCH: {brand} SERIAL FORMAT REFERENCE ===
{rawText from web search}
=== END ===

Task:
- Using the reference data above (if available), decode this serial/date code.
- Be conservative and avoid fake precision.
- Return strict JSON only.

Input:
- Brand: {brand}
- Serial: {normalizedSerial}
- Item description: {itemDescription}

Return exactly this JSON shape:
{ success, brand, normalizedSerial, source: "ai_heuristic", precision, confidence, year, period, productionWindow, message, note, rationale[], uncertainties[], candidates[], formatMatched }

Rules:
- confidence between 0 and 1. Increase if web search reference data confirms the format.
- If uncertain, use precision "year_window" or "unknown".
- Do not invent exact months/weeks unless strongly justified by reference data.
- Cite the reference source in rationale if web search data helped.
```

---

## 9. Serial Valuation (Pricing Guidance)

**File:** `src/lib/serialValuation.ts`

Pure math, no API calls. Calculates pricing guidance from a serial decode result and market average.

### Age Adjustment Table

| Item Age | Adjustment |
|---|---|
| 0-2 years | 0% |
| 2-5 years | -3% |
| 5-10 years | -7% |
| 10-15 years | -12% |
| 15-20 years | -18% |
| 20+ years | -25% |

### Confidence Penalty

```
confidencePenaltyPct = clamp((1 - decode.confidence) * 12, 0, 12)
```

A decode with 0.5 confidence gets a 6% penalty; 1.0 confidence gets 0% penalty.

### Formulas

```
totalAdjustmentPct = ageAdjustmentPct - confidencePenaltyPct
estimatedWorthEur = Math.round(marketAverageEur * (1 + totalAdjustmentPct / 100))
recommendedMaxPayEur = Math.round(estimatedWorthEur / 1.23 * 0.8)
```

| Formula | Meaning |
|---|---|
| `/ 1.23` | Remove 23% Irish VAT |
| `* 0.8` | Leave 20% profit margin |

---

## 10. Landed Cost Calculator

**File:** `src/lib/landedCost.ts`

Pure math, no API calls. Runs on the frontend.

### `calculateLandedCost(input)`

**Step-by-step:**

```
1. Convert to EUR:     itemCostEur = basePrice * rateToEur
2. Foreign fees:       platformFeeEur = itemCost * (platformFeePct / 100)
                       paymentFeeEur = itemCost * (paymentFeePct / 100)
3. CIF value:          cifEur = itemCostEur + shippingEur + insuranceEur
4. Customs duty:       dutyEur = cifEur * (customsPct / 100)
5. Import VAT:         vatEur = (cifEur + dutyEur) * (importVatPct / 100)
6. Total landed:       totalLandedEur = cifEur + dutyEur + vatEur + feesEur
7. Margin (optional):  marginEur = sellPriceEur - totalLandedEur
                       marginPct = marginEur / sellPriceEur * 100
```

### `calculateMaxBuyPrice(input)` -- Reverse calculation

Given a target sell price and desired margin, solves for the maximum base price:

```
targetLandedCostEur = targetSellPriceEur * (1 - desiredMarginPct / 100)
constantCostsEur = (shippingEur + insuranceEur) * importMultiplier + fixedFeeEur
maxBasePrice = (targetLandedCostEur - constantCostsEur) / (rateToEur * (importMultiplier + feeMultiplier))
```

Where:
- `importMultiplier = (1 + customsPct/100) * (1 + importVatPct/100)`
- `feeMultiplier = platformFeePct/100 + paymentFeePct/100`

---

## 11. Auction Landed Cost (Backend)

**File:** `packages/server/src/services/pricing/PricingService.ts`
**Route:** `POST /api/pricing/auction-landed-cost`

Auction-specific version with buyer's premium and platform fees.

```
buyerPremiumEur = hammerEur * (buyerPremiumPct / 100)
platformFeeEur = hammerEur * (platformFeePct / 100) + fixedFeeEur
paymentFeeEur = (hammerEur + buyerPremiumEur + platformFeeEur) * (paymentFeePct / 100)
preImportSubtotalEur = hammerEur + buyerPremiumEur + platformFeeEur + paymentFeeEur
customsValueEur = preImportSubtotalEur + shippingEur + insuranceEur
customsDutyEur = customsValueEur * (customsDutyPct / 100)
vatBaseEur = customsValueEur + customsDutyEur
importVatEur = vatBaseEur * (importVatPct / 100)
landedCostEur = preImportSubtotalEur + shippingEur + insuranceEur + customsDutyEur + importVatEur
```

Defaults are loaded from auction platform profiles stored in Firestore settings.

---

## 12. Business Insights

**File:** `packages/server/src/services/ai/AiService.ts`

**Gate:** `AI_PROVIDER=openai && OPENAI_API_KEY`

**Model:** `gpt-4o-mini` | **Temperature:** `0.7` | **Max tokens:** `300`

**Prompt:**
```
Analyze these business KPIs for a luxury reseller and provide 3 short, actionable, bullet-point insights.

KPIs:
- Total Inventory Value: {totalInventoryValue}
- Pending Buy List Value: {pendingBuyListValue}
- Active Sourcing Pipeline: {activeSourcingPipeline}
- Total Revenue (Recent): {revenue}
- Margin: {margin}%

Return ONLY a valid JSON object: { "insights": ["...", "...", "..."] }
```

---

## 13. Product Description Generator

**File:** `packages/server/src/services/ai/AiService.ts`

**Gate:** `AI_PROVIDER=openai && OPENAI_API_KEY`

**Model:** `gpt-4o-mini` | **Temperature:** `0.7` | **Max tokens:** `300`

**Prompt:**
```
Write a compelling, luxury-focused product description for SEO for the following item.

Brand: {brand}
Model: {model}
Category: {category}
Condition: {condition}
Colour: {colour}
Key Features: {notes}

The description should be professional, highlighting the craftsmanship and value. Keep it under 150 words.
```

---

## 14. Dashboard Prompt Bar

**File:** `packages/server/src/services/ai/AiService.ts`

**Gate:** `AI_PROVIDER=openai && OPENAI_API_KEY`

**Model:** `gpt-4o-mini` | **Temperature:** `0.5` | **Max tokens:** `150`

**System:** *"You are a concise assistant for a luxury resale business dashboard. Answer in 1-2 short sentences. Topics: inventory, KPIs, buying, sourcing, margins."*

---

## API Route Summary

| Route | Method | Service | Data Source |
|---|---|---|---|
| `/api/market-research/analyse` | POST | MarketResearchService | Web search + AI |
| `/api/pricing/price-check` | POST | pricing.ts (inline) | Web search + AI |
| `/api/pricing/analyse` | POST | PricingService -> OpenAIProvider | Web search + AI |
| `/api/pricing/auction-landed-cost` | POST | PricingService | Pure math |
| `/api/pricing/analyze-image` | POST | pricing.ts (inline) | gpt-4o Vision |
| `/api/ai/retail-lookup` | POST | AiService | Web search + AI |
| `/api/ai/serial-decode` | POST | AiService | Web search + AI |
| `/api/ai/describe` | POST | AiService | gpt-4o-mini |
| `/api/ai/insights` | POST | AiService | gpt-4o-mini |
| `/api/ai/prompt` | POST | AiService | gpt-4o-mini |

---

## Model Usage Summary

| Model | Used By | Cost Tier |
|---|---|---|
| `gpt-4o-mini` | SearchService, Market Research, Price Check, Pricing Analysis, Retail Price, Serial Decode, Business Insights, Description, Prompt | Low |
| `gpt-4o` | Image Analysis (Vision API) | High |
