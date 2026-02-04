# Luxselle Dashboard — Code Overview & Iteration 4

This document describes the current codebase and everything implemented in **Iteration 4** (Tests & Polish plus Features & Production Infrastructure). Use it as a single reference for writing further documentation.

---

## 1. What Iteration 4 Is

- **Iteration 4** (Phase 1 — aligned with **Phase 7** in `PLAN.md`): Documentation accuracy, backend API error shape and validation, unit tests, frontend polish (toasts instead of `alert`, loading/empty states), and E2E smoke tests. No large refactors.
- **Iteration 4** (Phase 2): New features (image upload, filters, profit reporting, product drawer, transactions, CSV export, etc.) plus **production infrastructure** (auth middleware, idempotency, jobs, React Query, cursor pagination, virtualization, structured logging).

---

## 2. Repo and Stack (Unchanged)

- **Package manager**: npm workspaces (root, `packages/server`, `packages/shared`). Not pnpm.
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS. Entry: `src/main.tsx` → `LuxselleApp.tsx`.
- **Backend**: Express in `packages/server/src`. Entry: `server.ts`.
- **Shared**: Zod schemas and inferred types in `packages/shared/src/schemas`.
- **Data**: Firebase Firestore + Storage; local dev uses Firebase Emulator Suite.
- **Routing**: React Router; Vite proxies `/api` to the backend (default backend port 3001).

---

## 3. High-Level Code Layout

```
luxselle-dashboard/
├── config/                 # Vite, Vitest, Playwright configs
├── docs/                   # PRD, PLAN, ARCHITECTURE, STATUS_AND_PLAN, iterations, firebase
├── firebase/               # firebase.json, firestore.rules, firestore.indexes.json, storage.rules
├── packages/
│   ├── server/src/         # config, lib, middleware, repos, routes, services
│   └── shared/src/schemas/ # Zod schemas
├── src/                    # Frontend
│   ├── components/         # Shared (e.g. ErrorBoundary)
│   ├── lib/                # api.ts, firebase.ts, queryClient.ts
│   ├── pages/              # One folder per page (Dashboard, Inventory, BuyBox, etc.)
│   ├── styles/             # Global CSS
│   ├── LuxselleApp.tsx
│   └── main.tsx
├── tests/e2e/              # Playwright E2E (evaluator.spec.ts)
├── index.html
├── package.json (workspaces: packages/server, packages/shared)
├── tailwind.config.js
├── postcss.config.js
└── tsconfig.json
```

---

## 4. Iteration 4 Phase 1 — What Was Done

- **Docs**: PLAN.md and root README kept accurate; setup/env/dev/seed/test/e2e instructions are executable with existing npm scripts.
- **Backend**:
  - **Standard API error shape**: `{ "error": { "code": string, "message": string, "details"?: object } }`. Implemented in `packages/server/src/lib/errors.ts` (`API_ERROR_CODES`, `formatApiError`). Used by Express error middleware in `server.ts` and by routes.
  - **Async errors**: Express error middleware ensures async route errors are caught and returned in that shape.
  - **Sourcing status validation**: `PUT /api/sourcing/:id` validates status transitions via `packages/server/src/lib/sourcingStatus.ts` (`isValidSourcingTransition`). Valid flow: open → sourcing → sourced → fulfilled | lost.
  - **Unit tests**: FX conversion (USD→EUR), status transitions (valid/invalid), CSV import mapping (parse + required headers). See `packages/server/src/lib/fx.test.ts`, `sourcingStatus.test.ts`, `services/import/SupplierImportService.test.ts`, `services/pricing/PricingService.test.ts`.
- **Frontend**:
  - **Toasts**: `alert()` replaced with `react-hot-toast` in main flows. Toaster is in `LuxselleApp.tsx`.
  - **Loading and empty states**: Consistent loading and empty states in Inventory, Buying List, Supplier Hub, Sourcing, Evaluator, Jobs.
  - **API usage**: Reads use `apiGet`; optional helpers `apiPost`, `apiPut`, `apiDelete` added and used (see `src/lib/api.ts`).
- **QA**: E2E smoke test in `tests/e2e/evaluator.spec.ts` (evaluator → add to buy list → receive → inventory). Run with `npm run test:e2e` (app must be up; see README).

---

## 5. Iteration 4 Phase 2 — Features Delivered

- **Product image upload**: `POST /api/products/:id/images` — upload to Firebase Storage, server-generated 512px thumbnails (Sharp), image objects with `id`, `url`, `thumbnailUrl`, `path`, `createdAt`, `createdBy`. Schema: `ProductImageSchema` in `packages/shared/src/schemas/product.ts`. Products have `images[]` (and legacy `imageUrls[]`).
- **Supplier Hub filters**: Supplier, brand, availability filters with URL param persistence.
- **lowStockThreshold from settings**: Dashboard KPIs (`GET /api/dashboard/kpis`) use `SettingsRepo` for low-stock count.
- **Buying List — Bulk Order**: Group-by-supplier view (“Bulk Order” mode).
- **Message generator**: WhatsApp and Email links with pre-filled messages for ordering.
- **Post-receive navigation**: After receive, navigate to `/inventory`.
- **Product Detail Drawer**: Full drawer with 5 tabs — Images, Details, Financials, History, Notes.
- **Transaction history**: `GET /api/products/:id/transactions` and `POST /api/products/:id/transactions` (record sale/adjustment). UI in drawer with Record Sale/Adjustment modals.
- **Inline editing**: Editing via drawer Details tab (no inline table cells).
- **Profit reporting**: Dashboard profit summary (revenue, cost, margin, items sold) — `GET /api/dashboard/profit-summary`.
- **CSV export**: Inventory export with proper escaping and dynamic filename.
- **Evaluator enhancements**: Smart brand/model dropdowns (auto-filtering), year/color/category, image upload with AI vision (Gemini/OpenAI), 70+ luxury models across 10 brands.

---

## 6. Iteration 4 Phase 2 — Production Infrastructure

- **Auth middleware** (`packages/server/src/middleware/auth.ts`): Verifies Firebase ID tokens, extracts `uid`, `email`, `role` (admin/operator/readOnly), `orgId`. `requireAuth`, `requireRole(...)`, `optionalAuth`, `getAuditFields`. Not applied to routes yet (deferred to Iteration 6 Auth UI).
- **Audit fields**: Schemas in `packages/shared` use optional `createdBy`, `updatedBy`; `BaseDocSchema` has `createdAt`, `updatedAt`, `organisationId`.
- **Multi-tenancy**: Org subcollections supported; backwards compatible with single org `"default"`.
- **Idempotency** (`packages/server/src/middleware/idempotency.ts`): `X-Idempotency-Key` header; stores responses in Firestore for replay; used on critical operations.
- **Atomic Firestore transactions**: Used for critical flows (e.g. receive flow).
- **SystemJob**: Enhanced with progress tracking; lifecycle queued → running → succeeded/failed.
- **Jobs UI**: `/jobs` — list jobs, filters, retry (and cancel) via `GET /api/jobs`, `GET /api/jobs/:id`, `POST /api/jobs/:id/retry`, `POST /api/jobs/:id/cancel`.
- **Request ID + logging** (`packages/server/src/middleware/requestId.ts`): UUID per request, structured JSON logging, error budget tracking.
- **React Query**: `@tanstack/react-query` in frontend; `queryClient` and `queryKeys` in `src/lib/queryClient.ts` (stale time, retries, refetch on focus). Data fetching uses React Query where applicable.
- **Table virtualization**: `@tanstack/react-virtual` for large lists (e.g. >50 items).
- **Cursor pagination**: List endpoints support `q`, `sort`, `dir`, `limit`, `cursor`.
- **API client**: `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiPostFormData` in `src/lib/api.ts`; parses standard error body and throws `ApiError` with status.

---

## 7. Backend in More Detail

- **Routes**: Mounted in `packages/server/src/server.ts` — `/api/products`, `/api/buying-list`, `/api/pricing`, `/api/suppliers`, `/api/dashboard`, `/api/sourcing`, `/api/jobs`. Health: `GET /api/health`.
- **Repos**: `BaseRepo` plus: ActivityEventRepo, BuyingListItemRepo, EvaluationRepo, ProductRepo, SettingsRepo, SourcingRequestRepo, SupplierItemRepo, SupplierRepo, SystemJobRepo, TransactionRepo. All in `packages/server/src/repos/`.
- **Services**: `PricingService` + providers (Mock, OpenAI, Gemini); `SupplierImportService` for CSV import. FX conversion uses `packages/server/src/lib/fx.ts` and settings `fxUsdToEur`.
- **Config**: `packages/server/src/config/env.ts` (Zod-validated env); `packages/server/src/config/firebase.ts` (Admin SDK, emulator vs real).

---

## 8. Frontend in More Detail

- **Views**: Dashboard (KPIs, profit summary, activity, command bar), Inventory (table/grid + ProductDetailDrawer), Buy Box (Evaluator), Supplier Hub, Buying List (list + bulk order + messaging), Sourcing, Jobs. Each in `src/pages/<PageName>/`.
- **State**: React Query for server state; local state for UI (drawers, modals, filters). Types inferred from shared Zod where possible; no `any` in main flows.
- **Errors**: Error boundary in `LuxselleApp.tsx`; toasts for API and user-facing errors.

---

## 9. API Endpoints (Quick Reference)

All list endpoints support: `q`, `sort`, `dir`, `limit`, `cursor`.

- **Products**: GET list, GET :id, POST, PUT :id, DELETE :id, POST :id/images, DELETE :id/images/:imageId, GET :id/transactions, POST :id/transactions.
- **Suppliers**: GET list, GET :id, POST, PUT :id, DELETE :id, GET items/all, GET :id/items, POST import.
- **Buying list**: GET list, GET :id, POST, PUT :id, DELETE :id, POST :id/receive.
- **Pricing**: POST analyse, POST analyze-image.
- **Sourcing**: GET list, GET :id, POST, PUT :id (status validated), DELETE :id.
- **Dashboard**: GET kpis, GET profit-summary, GET activity, GET status.
- **Jobs**: GET list, GET :id, POST :id/retry, POST :id/cancel.

---

## 10. Testing

- **Unit**: `npm run test` (Vitest). Covers FX, sourcing status, CSV import mapping, pricing.
- **E2E**: `npm run test:e2e` (Playwright). Evaluator flow, error handling, validation. Clear Firestore before/after in spec. Start app first (e.g. `npm run dev`), then run E2E; see README.

---

## 11. How to Run and Test (Commands)

- **Install**: `npm install`
- **Env**: Copy `.env.example` to `.env` (see README for variables).
- **Dev**: `npm run dev` — emulators + backend + frontend. Frontend usually http://localhost:5173, API http://localhost:3001.
- **Seed**: `npm run seed` (after dev is up).
- **Unit tests**: `npm run test`
- **E2E**: Start app, then `npm run test:e2e` (optionally `npx playwright install` once).
- **Build**: `npm run build` (frontend).

---

## 12. Summary

- **Iteration 4**: Docs accurate, standard API errors, sourcing validation, unit tests, toasts, loading/empty states, E2E smoke; plus image upload, filters, profit reporting, product drawer, transactions, CSV export, evaluator enhancements, auth/idempotency/jobs, React Query, cursor pagination, virtualization, request IDs and structured logging.

The codebase is production-oriented with consistent patterns; Iteration 6 (Auth UI) is deferred and backend auth is already in place.
