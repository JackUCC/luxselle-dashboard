# Luxselle Supplier Engine — Cleanup & Optimization Report

**Date:** 2025-02-26  
**Scope:** Static analysis only; no code changes. NPM workspaces monorepo: React/Vite in `src/`, Express in `packages/server/src`, shared Zod in `packages/shared`. Product: Supplier Engine (Overview + Sidecar).

---

## 1. Dead / Unused Code

### 1.1 Legacy procurement-list and supplier-feed

- **Finding:** No remaining references in `src/` or `packages/server/src/`. Mentions appear only in documentation and rules:
  - `docs/planning/PRD.md` (line 22), `docs/planning/CODE_AND_ITERATION_4.md` (line 14), `docs/planning/STATUS_AND_PLAN.md` (line 30), `.cursor/rules/global.mdc` (line 16).
- **Recommendation:** None for code. Optional: tighten PRD/STATUS to state “removed” explicitly so future readers don’t assume any code paths remain.

### 1.2 Buying list (backend + schema, no route or UI)

- **Finding:**
  - `packages/server/src/repos/BuyingListItemRepo.ts` exists and is never mounted (no `buying-list` or `buyingList` route in `server.ts`).
  - `packages/shared/src/schemas/buyingListItem.ts` and `BuyingListStatusSchema` in `base.ts` are only used by that repo.
  - No `BuyingListView` or any page under `src/pages/BuyingList/`; no route in `LuxselleApp.tsx` or `routeMeta.ts` for buying-list.
  - Docs still describe it: `docs/design/ARCHITECTURE.md` (lines 145, 156), `docs/CODE_REFERENCE.md` (lines 61, 77, 174), `docs/PROJECT_STRUCTURE.md` (line 56), `docs/ITERATION_5_EVIDENCE_PACK.md` (multiple).
- **Recommendation:**
  - **P0:** Remove or archive `BuyingListItemRepo.ts` and stop mounting it if the product has no buying-list scope (per “legacy removed” and current scope).
  - **P1:** If buying-list is abandoned, consider moving schema to a “legacy” export or removing from `packages/shared` public API to avoid accidental use.
  - **P2:** Update ARCHITECTURE, CODE_REFERENCE, PROJECT_STRUCTURE, and ITERATION_5_EVIDENCE_PACK to remove or mark buying-list as deprecated/removed.

### 1.3 Orphaned files / unused routes

- **Finding:** All views under `src/pages/` are referenced in `LuxselleApp.tsx` or as children (e.g. `DashboardSkeleton` used by `DashboardView`). All server route modules under `packages/server/src/routes/` (excluding `*.test.ts`) are mounted in `server.ts`. No orphaned page or route file found.
- **Recommendation:** None.

### 1.4 Unused exports

- **Finding:** Not fully audited (would require symbol-level analysis). Shared schema re-exports (`packages/shared/src/index.ts`) export everything from `./schemas`, including buying-list; if buying-list is removed, that export becomes unused.
- **Recommendation:** After deciding on buying-list (see 1.2), run a pass for unused exports in `packages/shared` and any barrel files.

---

## 2. Architectural Consistency

### 2.1 API usage (apiGet / apiPost pattern)

- **Finding:**
  - Most data fetching uses `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiPostFormData` from `src/lib/api.ts` (Dashboard, Inventory, Sourcing, Jobs, Invoices, BuyBox, MarketResearch, SerialCheck, RetailPrice, sidecar QuickCheck/BatchProcessor, widgets, ProductDetailDrawer, AddProductDrawer, ImportInventoryDrawer, etc.).
  - **Exceptions (raw `fetch`):**
    - **`src/components/widgets/CalculatorWidget.tsx`** (lines 169, 177): uses `fetch(\`${apiBase}/api/fx\`)` and fallback `fetch('https://api.frankfurter.app/...')`. The internal `/api/fx` call could use `apiGet('/fx')` for consistency and to benefit from `ApiError` and standard error parsing.
    - **`src/lib/ServerStatusContext.tsx`** (lines 24–25): uses `fetch(\`${API_BASE}/dashboard/status\`)` and manual content-type/JSON handling. Could use `apiGet('/dashboard/status')` for consistency; the “connection check” (handling HTML when backend is down) can be done on the thrown error or response handling.
    - **`src/lib/fxRate.ts`** (line 17): `fetch(url)` for external FX (Frankfurter or `VITE_FX_API_URL`). External API — keeping raw `fetch` is reasonable; no change required for consistency.
- **Recommendation:**
  - **P1:** Refactor `CalculatorWidget` to use `apiGet('/fx')` for the backend FX call; keep raw `fetch` only for the Frankfurter fallback.
  - **P1:** Refactor `ServerStatusContext` to use `apiGet('/dashboard/status')` and map errors to `isConnected: false`.

### 2.2 Error handling shape `{ error: { code, message, details? } }`

- **Finding:**
  - **Backend:** `packages/server/src/lib/errors.ts` defines `formatApiError(code, message, details?)` and the standard shape. Routes and global error handler in `server.ts` (lines 89–159) use it. Idempotency middleware uses `formatApiError` for 409. No route was found that returns a different error shape.
  - **Frontend:** `src/lib/api.ts` documents and parses that shape (`ApiErrorBody`, `getErrorMessage` uses `json.error?.message`). Tests in `packages/server/src/routes/*.test.ts` assert `res.body.error.code`, `res.body.error.message`, and where applicable `res.body.error.details`.
  - **Inconsistency:** **`packages/server/src/routes/search.test.ts`** (lines 21–24): the test app’s error middleware returns `{ error: { message: e.message ?? 'Internal error' } }` only — no `code` or `details`. So search route tests do not validate the full error contract.
- **Recommendation:**
  - **P1:** In `search.test.ts`, change the test error middleware to use `formatApiError` (or a small helper that returns `{ error: { code, message, details? } }`) so that all route tests assert the same error shape.

### 2.3 Types from shared Zod (avoid `any`)

- **Finding:**
  - **Frontend:** No `any` in `src/` (grep for `: any`, `as any`, etc. found none). Many modules correctly use `@shared/schemas` or `@luxselle/shared` (e.g. Product, Invoice, SourcingRequest, SystemJob, SerialDecodeResult, ProductImage, etc.). **`src/pages/MarketResearch/MarketResearchView.tsx`** defines local interfaces (`MarketComparable`, `MarketResearchResult`, `TrendingResult`, `CompetitorFeedResult`, etc.) instead of importing from shared; if those types are (or will be) used by the backend or shared, they are good candidates to move to `packages/shared` and infer from Zod.
  - **Backend:** A few `any` usages:
    - **`packages/server/src/services/ai/AiService.ts`** (line 20): `private openai: any`; (line 63): `generateBusinessInsights(kpis: any)`. Could be typed with a minimal interface or shared type.
    - **`packages/server/src/repos/BaseRepo.ts`** (line 40, 45): `z.ZodType<T, any, any>` — common for Zod generic params; low priority.
    - **`packages/server/src/services/market-research/MarketResearchService.ts`** (lines 387, 396): `parseJSON(text: string): any`, `formatResult(parsed: any, ...)`. Could use typed interfaces or `unknown` + type guards.
- **Recommendation:**
  - **P2:** Replace `any` in `AiService` and `MarketResearchService` with concrete types or `unknown` where appropriate.
  - **P2:** Consider moving Market Research result types to `packages/shared` and reusing in backend/frontend for consistency.

---

## 3. Slop and Cleanup

### 3.1 Commented-out code

- **Finding:** No large commented-out blocks or multiple consecutive comment-only lines that suggest dead code. Only short comments (e.g. section labels like `// Main — Overview`, `// Legacy redirect`, `// API returns { data: { ... } }`) and JSDoc. **`src/LuxselleApp.tsx`** line 131: `{/* Legacy redirect */}` is a single descriptive comment for the `/evaluator` → `/buy-box` route; fine to keep.
- **Recommendation:** None.

### 3.2 Duplicate / repeated logic

- **Route list duplication:** **`src/LuxselleApp.tsx`** defines the same set of `<Route path="..." element={...} />` twice (Sidecar block ~lines 54–62, Overview block ~lines 121–132). Adding a new route requires editing both. Same `/evaluator` redirect in both.
- **Recommendation:** **P2:** Extract the route list (and redirect) into a single array or component (e.g. `appRoutes` from `routeMeta` or a small `AppRoutes` component) and render once inside both layout branches to avoid drift.

- **Loading and empty states:** Many pages implement the same pattern: `useState` for `isLoading`, set true before request and false in `finally`, then render either a spinner (e.g. `Loader2` + `animate-spin`) and “Loading...” / “Loading…” or the main content. Affected files include:
  - `DashboardView.tsx`, `InventoryView.tsx`, `InvoicesView.tsx`, `JobsView.tsx`, `SourcingView.tsx`, `SerialCheckView.tsx`, `RetailPriceView.tsx`, `MarketResearchView.tsx`, `ProductDetailDrawer.tsx`, `AiInsightsWidget.tsx`, `SerialCheckWidget.tsx`, `SidecarFxWidget.tsx`, `SidecarSerialCheckWidget.tsx`, `EurToYenWidget.tsx`, `QuickCheck.tsx`, etc.
- **Recommendation:** **P2:** Introduce a small shared primitive, e.g. `PageLoadingGate` or `LoadingSpinner` (with optional message), and/or a `useAsyncLoad`-style hook that returns `{ loading, error, data }` so loading/empty UI is consistent and copy (“Loading...”, “Loading…”) is in one place.

- **Serial check flow duplication:** **`src/components/widgets/SerialCheckWidget.tsx`** and **`src/components/sidecar/widgets/SidecarSerialCheckWidget.tsx`** both implement serial decode + price-check (serial-decode API then price-check API) with similar error handling and loading state. **`src/pages/SerialCheck/SerialCheckView.tsx`** and **`src/pages/BuyBox/EvaluatorView.tsx`** (and sidecar `QuickCheck`) also have overlapping “analyze then show result” patterns.
- **Recommendation:** **P2:** Consider a shared hook (e.g. `useSerialDecodeAndPriceCheck`) or a small service/helper used by both widgets and the Serial Check page to reduce duplication and keep behavior in sync.

### 3.3 Copy and UX consistency

- **Finding:** Mixed use of “Loading...” (three dots) vs “Loading…” (single ellipsis character) and “Analyzing…” vs “Analyzing...”. Minor inconsistency.
- **Recommendation:** **P2:** Standardize on one style (e.g. “Loading…” and “Analyzing…”) and, if a shared loading component is added, centralize the string there.

---

## 4. Dependency Notes

- **Static inspection only** (no `npm audit` or install). All references below are to `package.json` files.

### 4.1 Duplicates across root vs packages

- **`pdfmake`:** Listed in **root** `package.json` and in **`packages/server/package.json`**. Used only in **`packages/server/src/services/InvoicePdfService.ts`**. Frontend does not use pdfmake.
- **Recommendation:** Remove `pdfmake` from root `package.json` so only the server package depends on it.

- **`firebase-admin`:** Listed in **root** `package.json`. Used only in **`packages/server`** (e.g. `config/firebase.ts`, `repos/BaseRepo.ts`, `middleware/auth.ts`, scripts like `migrate-firestore-to-eur.ts`). No import of `firebase-admin` in `src/`.
- **Recommendation:** Remove `firebase-admin` from root `package.json` so only the server package depends on it. If a root-level script ever needs it, that script can be moved under `packages/server/scripts` or run via `npm run … --workspace=@luxselle/server`.

### 4.2 Other observations

- **`zod`:** In both `packages/shared` and `packages/server` — expected; no duplication concern.
- **`typescript`:** In root, server, and shared — expected for a monorepo.
- **Versions:** Root and server both use `"typescript": "^5.6.3"`; shared uses `"typescript": "^5.6.3"`. Aligned. No obvious outdated or conflicting versions from static inspection.

---

## 5. Summary and Priority

| Priority | Area | Action |
|----------|------|--------|
| **P0** | Dead code | Remove or archive BuyingListItemRepo (and optionally buying-list schema) if buying-list is out of scope; update docs. |
| **P1** | API consistency | Use `apiGet` in CalculatorWidget (for `/fx`) and ServerStatusContext (for `/dashboard/status`). |
| **P1** | Error contract | Make search.test.ts error middleware return full `{ error: { code, message, details? } }` (e.g. via formatApiError). |
| **P2** | Types | Replace `any` in AiService and MarketResearchService; consider shared types for Market Research. |
| **P2** | DRY | Single route list in LuxselleApp; shared loading/empty component or hook; shared serial-decode/price-check logic. |
| **P2** | Copy | Standardize “Loading…” / “Analyzing…” across the app. |
| **P2** | Dependencies | Remove `pdfmake` and `firebase-admin` from root package.json. |

**Validation checklist (after any future code changes):**

- `npm run typecheck`
- `npm test`
- `npm run test:e2e` (with dev stack running)
- Manual smoke: Overview and Sidecar modes, key flows (Dashboard → Inventory, Price Check, Invoices)

---

*Report generated from static analysis; no code was modified.*
