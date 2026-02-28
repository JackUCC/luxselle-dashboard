---
status: awaiting_human_verify
trigger: "Price Check feature returns wildly inaccurate/low prices. Searching 'Chanel Classic Flap Medium, black caviar, gold hardware' returns €10 avg selling price (should be ~€2,000-€4,000+). Only finds 1 comparable listing at €10 confidence 50%. Max buy target €7, max bid €7 - all completely wrong."
created: 2026-02-28T00:00:00Z
updated: 2026-02-28T00:02:00Z
---

## Current Focus

hypothesis: The PriceCheckService extraction prompt tells AI to return 0 comps when fewer than 2 real listings found, BUT the filterValidComps has COMP_PRICE_MIN=10 filtering out all prices below €10. When the web search returns weak/wrong data and AI extracts a single listing at very low price (e.g., €10 for a Chanel accessory or shipping fee), it just barely passes the filter and corrupts averageSellingPriceEur.
test: Investigate (1) what the web search actually returns, (2) whether domain filtering in searchMarket is working, (3) whether the extraction prompt needs stronger rules
expecting: Find that the AI is getting ambiguous/sparse web search results, extracting the wrong item/price, and the prompt isn't protective enough
next_action: Check the extraction prompt for currency/price confusion and verify the searchMarketMulti domain filtering logic works

## Symptoms

expected: Searching "Chanel Classic Flap Medium, black caviar, gold hardware" returns ~€2,000-€4,000+ market prices with multiple comparable listings
actual: Returns AVG SELLING PRICE €10, MAX BUY TARGET €7, MAX BID TARGET €7. Only 1 comparable listing found "Chanel Classic Flap Bag" from Vestiaire Collective at €10. Confidence: 50%.
errors: No visible error messages - API call completes with wrong data
reproduction: Price Check page -> type "Chanel Classic Flap Medium, black caviar, gold hardware" -> click "Research market"
started: Unknown - may never have worked or broke recently

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-02-28T00:01:00Z
  checked: PriceCheckService.ts lines 137-153
  found: When AI_PROVIDER=mock, returns hardcoded €1200 avg with 2 comps at €1150/€1250. When AI_PROVIDER=openai, uses searchMarketMulti + OpenAI extraction.
  implication: Mock mode works fine. The bug is in the openai path.

- timestamp: 2026-02-28T00:02:00Z
  checked: Math in PriceCheckService.check() lines 159-160
  found: maxBuyEur = Math.round((10 / 1.23) * 0.8) = 7, maxBidEur = Math.round(7 / 1.07) = 7. This exactly matches reported symptoms.
  implication: The averageSellingPriceEur = 10 is confirmed as root of the wrong numbers.

- timestamp: 2026-02-28T00:03:00Z
  checked: filterValidComps in validation.ts - COMP_PRICE_MIN = 10
  found: Comps with price < 10 are filtered out. A comp at exactly €10 passes.
  implication: Even if AI returns a €10 comp, it passes validation. Any comp below €10 would be rejected.

- timestamp: 2026-02-28T00:04:00Z
  checked: SearchService.searchMarket() domain filtering logic
  found: The domains variable is computed from allowlist but is NOT passed to OpenAI web_search tool as a domain restriction. The code adds search_context_size:'high' when domains.length > 0, but never actually passes allowed_domains to the API. Domain filtering only happens AFTER the search, filtering URL annotations.
  implication: The web search is NOT restricted to vestiairecollective.com etc. even though domains are configured. Only query text provides any targeting (via site: operators in searchMarketMulti queries).

- timestamp: 2026-02-28T00:05:00Z
  checked: searchMarketMulti queries
  found: Query 1: "Chanel Classic Flap Medium... site:vestiairecollective.com price". Query 2: same + site:designerexchange.ie. Query 3: same + "pre-owned for sale price EUR". These are separate OpenAI Responses API calls each with web_search tool.
  implication: The site: operator in the query text is the only domain restriction. OpenAI's web_search tool may or may not respect site: operators perfectly.

- timestamp: 2026-02-28T00:06:00Z
  checked: PriceCheckService extraction prompt rules (lines 88-100)
  found: "If you cannot find at least 2 real listings with prices, return averageSellingPriceEur: 0 and empty comps." AND "Every comparable listing MUST have a sourceUrl from the search results." But these are instructions to AI - they can be violated if the AI interprets them differently, or if it finds only 1 real listing but still returns it.
  implication: The AI may be finding 1 listing (at €10 for a non-bag Chanel item or misread price) and including it anyway, violating the >=2 rule. The "at least 2" instruction is in CRITICAL RULES section but comes AFTER the "extract 3-6 real comparable listings" rule which contradicts it.

- timestamp: 2026-02-28T00:07:00Z
  checked: Math verification for €10 scenario
  found: If 1 comp at €10 → averageSellingPriceEur=10, maxBuyEur=round(10/1.23*0.8)=7, maxBidEur=round(7/1.07)=7. Confidence shows 50% (=1 comp). EXACTLY matches user report.
  implication: This is definitively a case where the AI returned 1 comp with price=€10. The question is why.

- timestamp: 2026-02-28T00:08:00Z
  checked: savedResearch route and SavedResearchView.tsx
  found: Saved Research saves/lists market research results from MarketResearchService, not PriceCheckService. They are separate features. PriceCheck (BuyBox page) does NOT have a "previous search result" save feature - it's stateless per session.
  implication: The "previous search result" feature user mentioned likely refers to the Saved Research page which shows MarketResearch results, not Price Check results. These are different features and the Price Check page has no caching/history.

## Resolution

root_cause: |
  Two compounding bugs in PriceCheckService.ts:

  BUG 1 — Contradictory AI prompt (primary cause of €10 result):
  The extraction prompt has two contradictory sections:
  - CRITICAL RULES: "If you cannot find at least 2 real listings with prices, return averageSellingPriceEur: 0 and empty comps."
  - Rules: "Extract 3-6 real comparable listings from the search results with their actual prices and URLs"
  When the web search finds only 1 listing (a cheap Chanel accessory or a page with just 1 price mentioned), the AI
  follows "Rules" and extracts it, overriding CRITICAL RULES. Result: 1 comp at €10 passes filterValidComps
  (COMP_PRICE_MIN=10) and produces averageSellingPriceEur=10.

  BUG 2 — No server-side enforcement of minimum comp threshold:
  After AI returns parsed comps, the code at line 124 checks `if (comps.length > 0)` and uses ALL comps
  including a single spurious one. There is no server-side guard that resets comps to [] when fewer than 2
  valid comps were found. The minimum-2 rule is entirely AI-enforced, which is unreliable.

  CONSEQUENCE: averageSellingPriceEur=10, maxBuyEur=round(10/1.23*0.8)=7, maxBidEur=round(7/1.07)=7.
  Exactly matches the reported symptoms.

fix: |
  Three fixes applied:

  1. packages/server/src/lib/validation.ts: Raised COMP_PRICE_MIN from 10 → 50 EUR.
     A €10 comparable for a luxury bag is clearly invalid. €50 still allows wallets/accessories
     while eliminating shipping charges, fees, and obviously wrong items.

  2. packages/server/src/services/price-check/PriceCheckService.ts:
     - Added server-side enforcement: after filterValidComps, if allComps.length < 2, comps = []
       and averageSellingPriceEur = 0. Removes reliance on the AI following the "≥2 comps" rule.
     - Fixed contradictory extraction prompt: merged two conflicting rule sections into one
       unified RULES block. Removed the "extract 3-6 listings" instruction that contradicted
       the "return empty if <2 found" rule. Added explicit guidance to ignore accessories,
       dust bags, authentication cards, and shipping charges that could contaminate results.

  3. src/pages/BuyBox/EvaluatorView.tsx: Display "—" instead of €0 when averageSellingPriceEur,
     maxBuyEur, or maxBidEur is 0. The existing amber warning box ("No comparable listings found")
     already signals why. This prevents confusingly showing €0 as a price target.

verification: |
  - npm test: 145/145 tests pass (no regressions)
  - npm run typecheck: 0 TypeScript errors
  - Logic verification: If AI now returns 1 comp at €10 (below new COMP_PRICE_MIN=50), it is
    filtered by filterValidComps. If it returns 1 comp at €50-100, server-side allComps.length<2
    resets to comps=[] and avg=0. UI shows "—" with amber warning. No more €7 max bid.

files_changed:
  - packages/server/src/lib/validation.ts (COMP_PRICE_MIN: 10 → 50)
  - packages/server/src/services/price-check/PriceCheckService.ts (server-side enforcement + prompt fix)
  - src/pages/BuyBox/EvaluatorView.tsx (show "—" when price is 0)
