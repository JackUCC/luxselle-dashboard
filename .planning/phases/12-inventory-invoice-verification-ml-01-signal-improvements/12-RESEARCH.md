# Phase 12: Inventory + Invoice Verification + ML-01 Signal Improvements - Research

**Researched:** 2026-03-01
**Domain:** Operational QA hardening (inventory/invoices), confidence scoring improvements, trend-signal integration
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUAL-01 | Inventory and Invoice flows verified end-to-end with edge-case evidence | Existing Playwright suites and route tests provide baseline; phase work extends matrix and fixes regressions found during audit |
| ML-01 | Confidence and trend signal quality improves for pricing guidance | `PriceCheckService` + `MarketResearchService` already compute confidence and can ingest richer signal inputs without architecture rewrite |
</phase_requirements>

---

## Summary

Phase 12 should be split into two quality plans and one ML signal plan:
- `12-01` Inventory verification/fixes
- `12-02` Invoice verification/fixes
- `12-03` Confidence + trend-signal integration

This sequencing reduces risk: operational correctness first, then signal refinement.

Current test assets already cover core paths:
- `tests/e2e/inventory.spec.ts`
- `tests/e2e/invoices.spec.ts`
- `packages/server/src/routes/products.test.ts`
- `packages/server/src/routes/invoices.test.ts`

Gap is edge-case depth and explicit defect closure evidence.

---

## Verified Codebase Seams

### Inventory

- `src/pages/Inventory/InventoryView.tsx`
- `src/pages/Inventory/ProductDetailDrawer.tsx`
- `packages/server/src/routes/products.ts`
- `packages/server/src/routes/products.test.ts`

### Invoices

- `src/pages/Invoices/InvoicesView.tsx`
- `packages/server/src/routes/invoices.ts`
- `packages/server/src/services/InvoicePdfService.ts`
- `packages/server/src/routes/invoices.test.ts`

### ML Signals

- `packages/server/src/services/price-check/PriceCheckService.ts`
- `packages/server/src/services/market-research/MarketResearchService.ts`
- `packages/shared/src/schemas/pricing.ts`
- `src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx`

---

## Recommended Strategy

1. Inventory verification plan:
- expand e2e matrix (creation, status transitions, transaction history, sale flow integrity)
- patch defects uncovered by the matrix
- lock with backend + e2e tests

2. Invoice verification plan:
- expand coverage for create variants (`fromSale`, `fromInPerson`, full body)
- verify pagination/filtering and PDF generation/error paths
- lock with route and e2e tests

3. ML signal plan:
- add structured confidence factors in backend response diagnostics
- add trend influence from Phase 11 snapshots
- show confidence decomposition in UI labels/tooltips

---

## Risks and Mitigations

1. False confidence from sparse comps:
- Mitigation: confidence floor/ceiling tied to evidence count and provenance quality.

2. Flaky operational e2e tests:
- Mitigation: deterministic seeding/cleanup and route-level stubs where external dependencies are unstable.

3. Trend drift from stale snapshots:
- Mitigation: freshness-weighted trend contribution; stale signals degrade confidence.

4. Overfitting UI copy to internal metrics:
- Mitigation: keep user-facing copy concise and explain uncertainty clearly.

---

## Validation Architecture

### Automated

- `npm run typecheck`
- `npm test -- packages/server/src/routes/products.test.ts packages/server/src/routes/invoices.test.ts`
- `npm run test:e2e -- inventory.spec.ts invoices.spec.ts evaluator.spec.ts`

### Phase validation targets

- Inventory and invoice critical operations pass with deterministic evidence.
- Regression fixes are covered by tests that failed pre-fix.
- ML signal fields are deterministic and documented in shared contracts.
- Evaluator/market-research surfaces show improved confidence/trend clarity.
