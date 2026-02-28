# Luxselle Dashboard — Full Feature Audit & Issue Log

**Date**: 2026-02-28
**Build status before fixes**: All 129 unit tests passing, typecheck clean, Vite build succeeds.

---

## Test Results Summary

| Gate | Status |
|------|--------|
| `npm test` (Vitest, 25 files, 129 tests) | PASS |
| `npm run typecheck` (tsc --noEmit) | PASS (0 errors) |
| `npm run build` (Vite production) | PASS (8.6s) |

---

## Features Audited

| Feature | Route(s) | Page | Status |
|---------|----------|------|--------|
| Dashboard KPIs | GET `/dashboard/kpis` | `/` | OK |
| Dashboard Profit Summary | GET `/dashboard/profit-summary` | `/` | BUG FOUND |
| Dashboard Activity | GET `/dashboard/activity` | `/` | OK |
| Inventory List | GET `/products` | `/inventory` | ISSUE FOUND |
| Inventory CRUD | POST/PUT/DELETE `/products` | `/inventory` | OK |
| Inventory Import (CSV/Excel/PDF) | POST `/products/import` | `/inventory` | OK |
| Inventory Images | POST/DELETE `/products/:id/images` | `/inventory` | OK |
| Buy Box / Evaluator | POST `/pricing/*` | `/buy-box` | OK |
| Sourcing Pipeline | GET/POST/PUT/DELETE `/sourcing` | `/sourcing` | ISSUE FOUND |
| Invoices List | GET `/invoices` | `/invoices` | ISSUE FOUND |
| Invoices CRUD | POST/DELETE `/invoices` | `/invoices` | OK |
| Invoice PDF Generation | POST `/invoices/:id/generate-pdf` | `/invoices` | OK |
| Invoice Upload | POST `/invoices/upload` | `/invoices` | OK |
| Market Research | POST `/market-research/analyse` | `/market-research` | OK |
| Trending Items | GET `/market-research/trending` | `/market-research` | OK |
| Competitor Feed | GET `/market-research/competitor-feed` | `/market-research` | OK |
| Serial Check | POST `/ai/serial-decode` | `/serial-check` | OK |
| Retail Price Lookup | POST `/ai/retail-lookup` | `/retail-price` | OK |
| VAT Calculator | GET/POST `/vat/calculate` | Widget | OK |
| FX Rates | GET `/fx` | Widget | OK |
| Settings | GET/PATCH `/settings` | Backend | OK |

---

## Issues Found & Fixes Applied

### CRITICAL — Dashboard Profit Ignores Quantity

- **File**: `packages/server/src/routes/dashboard.ts:120-121`
- **Issue**: Profit summary calculates `totalCost` and `totalRevenue` per sold product without multiplying by `product.quantity`. A product with quantity=3 and costPriceEur=100 shows cost=100 instead of 300. The KPIs endpoint correctly multiplies by quantity (line 32), creating an inconsistency.
- **Fix**: Multiply by `p.quantity` in both `totalCost` and `totalRevenue` reducers, and in the per-item margin calculation.

### HIGH — Unsafe sortField in Products Route

- **File**: `packages/server/src/routes/products.ts:364-376`
- **Issue**: `sortField` is taken directly from `req.query.sort` without validation against known product fields. An attacker could pass `sort=__proto__` or other malicious field names. The value is used to index into product objects via `(a as Record<string, unknown>)[sortField]`.
- **Fix**: Validate `sortField` against an allowlist of known sortable fields. Fall back to `createdAt` if invalid.

### HIGH — Unsafe sortField + NaN Limit in Sourcing Route

- **File**: `packages/server/src/routes/sourcing.ts:63-78`
- **Issue**: Same sortField problem as products. Additionally, `parseInt(String(limit))` can return NaN without a fallback (unlike products which has `|| 50`).
- **Fix**: Validate sortField against allowlist. Add NaN guard for limit.

### MEDIUM — Invoice List Missing Total

- **File**: `packages/server/src/routes/invoices.ts:295`
- **Issue**: Invoice list returns `{ data, nextCursor }` but products and sourcing routes return `{ data, nextCursor, total }`. Inconsistent API response format.
- **Fix**: Add `total: list.length` to the response.

### MEDIUM — SourcingView filteredRequests Not Memoized

- **File**: `src/pages/Sourcing/SourcingView.tsx:216-219`
- **Issue**: `filteredRequests` is computed inline on every render without `useMemo`. With a large list of sourcing requests, this causes unnecessary recalculations.
- **Fix**: Wrap in `useMemo` with `[requests, statusFilter]` dependencies.

### LOW — Silent Catch in MarketResearchView

- **File**: `src/pages/MarketResearch/MarketResearchView.tsx:249`
- **Issue**: `catch { /* ignore */ }` silently drops localStorage errors. If quota is exceeded or storage is disabled, there's no way to debug.
- **Fix**: Add `console.warn` for debugging visibility.

### LOW — API Error Exposes Deployment Configuration

- **File**: `src/lib/api.ts:74-75, 123-124`
- **Issue**: When the backend returns an HTML page (e.g. misconfigured proxy), the error message says "Backend URL not set. In Vercel: Settings → Environment Variables → add VITE_API_BASE = your Railway URL..." This leaks deployment infrastructure details to end users.
- **Fix**: Use a generic "Cannot connect to server. Please try again or contact support." message.

---

## Items Verified as Non-Issues

| Item | Finding |
|------|---------|
| Invoice POST returns 200 | Already returns 201 on all creation paths (lines 146, 160, 191, 269) |
| InvoicesView key prop using index | Already uses `key={inv.id}` (line 265), not index |
| Invoice NaN handling | `isNaN(amountEur)` check on line 225 correctly catches NaN before the `< 0` check |
| Invoice VAT double-counting | `amountEur` in line items is net (confirmed by build functions), VAT calculation is correct |
| Sourcing status transitions | Properly validated via `isValidSourcingTransition()` with activity events |
| Product schema validation | Zod schemas correctly validate all CRUD inputs |
| React cleanup patterns | useEffect hooks in MarketResearchView use cancellation flags correctly |

---

## Test Coverage Gaps (Informational)

- No auth/authorization middleware (single-tenant by design)
- No E2E tests for invoice create flow
- No unit tests for profit-summary endpoint
- No tests validating sortField rejection of unknown fields
- Frontend components have minimal test coverage (4 files in `src/lib/`)
