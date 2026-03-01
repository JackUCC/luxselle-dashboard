---
phase: 12
name: Inventory + Invoice Verification + ML-01 Signal Improvements
milestone: v3.0
requirement: QUAL-01, ML-01
status: planned
---

# Phase 12 Context: Inventory + Invoice Verification + ML-01 Signal Improvements

## Phase Goal

Close two release-critical tracks:
1. **QUAL-01:** Verify inventory and invoice flows end-to-end with clear regression evidence and fix any discovered defects.
2. **ML-01:** Improve confidence scoring and trend-signal usefulness in price guidance using evidence quality and market-intel context.

## Why This Phase Exists

The product now has broad feature coverage, but remaining launch risk is quality confidence:
- Inventory and invoices are operationally critical and must be fully verified.
- AI guidance currently uses basic confidence heuristics; users need more meaningful confidence/trend signals.

## Current Baseline

- E2E tests exist for inventory and invoices but focus on core happy paths.
- Backend route tests exist for products/invoices, but edge-case matrix coverage is incomplete.
- `PriceCheckService` and `MarketResearchService` already compute confidence values and can be upgraded without rewriting service architecture.

## Locked Decisions

1. Do verification first (Inventory + Invoice) before ML signal changes in this phase.
2. Keep ML-01 incremental: enrich existing scoring logic rather than replacing with a new model stack.
3. Use evidence-aware confidence inputs: comparable count, source quality, freshness, and trend agreement.
4. Any defects found by QUAL-01 are fixed in-phase and covered by automated tests.

## Out of Scope (Phase 12)

- External ML infrastructure (feature stores, training pipelines, model serving clusters).
- Predictive demand forecasts beyond near-term trend signals.
- Broad UI redesign unrelated to verification or ML signal clarity.

## Success Criteria

1. Inventory flows (create/update/status/transaction/sell flow) are verified with robust E2E + route tests.
2. Invoice flows (create/save/list/pdf/export variants) are verified with edge-case coverage.
3. Confidence score better reflects evidence quality and freshness.
4. Trend signals from INTEL-02 cache influence guidance in evaluator/research outputs.
