# Code Reference

This document indexes all documented code in the Luxselle Dashboard: purpose, location, and external references (libraries, APIs, patterns). Use it to find where behaviour lives and what it depends on.

**Conventions used in the repo:**
- **Comments** in code explain *what* the code does (logic, flow, edge cases).
- **References** in file headers or this doc indicate *where* patterns or types come from (e.g. Express, Firebase, Zod).
- Code that is explicitly referenced and documented is listed below with file path and a short description.

---

## Root & config

| File | Purpose | References |
|------|--------|------------|
| `index.html` | Vite entry HTML; mounts React root. | Vite |
| `package.json` | NPM workspaces (server, shared), scripts (dev, seed, test, e2e). | NPM workspaces |
| `tsconfig.json` | TypeScript config; path alias `@shared`. | TypeScript |
| `tailwind.config.js` | Tailwind theme and content paths. | Tailwind CSS |
| `postcss.config.js` | PostCSS pipeline (Tailwind). | PostCSS |
| `config/vite.config.ts` | Vite dev server, proxy `/api` to backend. | Vite |
| `config/vitest.config.ts` | Vitest for unit tests (server). | Vitest |
| `config/playwright.config.ts` | Playwright for E2E tests. | Playwright |

---

## Backend — packages/server

### Entry & config

| File | Purpose | References |
|------|--------|------------|
| `packages/server/src/server.ts` | Express app: CORS, JSON, request ID/logging, route mounting, global error handler (Zod + generic 500). | Express, Zod |
| `packages/server/src/config/env.ts` | Load and validate env with Zod; exports `env` (PORT, Firebase, AI provider, currency, margin). | dotenv, Zod |
| `packages/server/src/config/firebase.ts` | Initialize Firebase Admin (App, Firestore, Storage); set emulator hosts when `FIREBASE_USE_EMULATOR` is true. | firebase-admin |

### Lib

| File | Purpose | References |
|------|--------|------------|
| `packages/server/src/lib/errors.ts` | API error codes and `formatApiError()` for standard `{ error: { code, message, details? } }` shape. | — |
| `packages/server/src/lib/fx.ts` | `usdToEur(usd, rate)` for pricing/import; used by pricing service and CSV import. | — |
| `packages/server/src/lib/sourcingStatus.ts` | Sourcing status state machine: `isValidSourcingTransition`, `getValidNextStatuses`; uses shared `SourcingStatusSchema`. | @shared/schemas |
| `packages/server/src/lib/vat.ts` | VAT helpers: `vatFromNet(netEur, ratePct)`, `vatFromGross(grossEur, ratePct)`; used by VAT API and invoices. | — |

### Middleware

| File | Purpose | References |
|------|--------|------------|
| `packages/server/src/middleware/requestId.ts` | Adds `requestId` (or `x-request-id`) and `startTime`; `requestLogger` logs start/end; `logger` (JSON); `errorTracker` for error budget. | Express, crypto (randomUUID) |
| `packages/server/src/middleware/auth.ts` | `requireAuth` (Firebase ID token), `requireRole`, `optionalAuth`, `getAuditFields`; supports `SKIP_AUTH` for dev. | firebase-admin/auth, Express |
| `packages/server/src/middleware/idempotency.ts` | Idempotency via `X-Idempotency-Key`; stores completed response in Firestore for replay; `generateFileIdempotencyKey` for imports. | Express, Firestore |

### Repos (Firestore access)

| File | Purpose | References |
|------|--------|------------|
| `packages/server/src/repos/BaseRepo.ts` | Base CRUD over Firestore; supports org subcollections (`orgs/{orgId}/{collection}`) or legacy root collection + `organisationId`. | firebase-admin/firestore, Zod |
| `packages/server/src/repos/index.ts` | Re-exports all repos. | — |
| `packages/server/src/repos/ProductRepo.ts` | Products collection. | BaseRepo, ProductSchema |
| `packages/server/src/repos/BuyingListItemRepo.ts` | Buying list items. | BaseRepo, BuyingListItemSchema |
| `packages/server/src/repos/SupplierRepo.ts` | Suppliers. | BaseRepo, SupplierSchema |
| `packages/server/src/repos/SupplierItemRepo.ts` | Supplier items (nested or linked). | BaseRepo, SupplierItemSchema |
| `packages/server/src/repos/TransactionRepo.ts` | Transactions; `findByProductId`. | BaseRepo, TransactionSchema |
| `packages/server/src/repos/EvaluationRepo.ts` | Evaluations (e.g. buy-box). | BaseRepo, EvaluationSchema |
| `packages/server/src/repos/ActivityEventRepo.ts` | Activity/audit events. | BaseRepo, ActivityEventSchema |
| `packages/server/src/repos/SourcingRequestRepo.ts` | Sourcing requests. | BaseRepo, SourcingRequestSchema |
| `packages/server/src/repos/SettingsRepo.ts` | Org/user settings. | BaseRepo, SettingsSchema |
| `packages/server/src/repos/InvoiceRepo.ts` | Invoices; getNextInvoiceNumber(orgId). | BaseRepo, InvoiceSchema |
| `packages/server/src/repos/SystemJobRepo.ts` | System jobs (e.g. import). | BaseRepo, SystemJobSchema |

### Routes (API)

| File | Purpose | References |
|------|--------|------------|
| `packages/server/src/routes/products.ts` | CRUD products; list (search, sort, cursor); image upload (multer + sharp → Firebase Storage); transactions sub-resource. | Express, multer, sharp, Firebase Storage |
| `packages/server/src/routes/buying-list.ts` | CRUD buying list items. | Express, BuyingListItemRepo |
| `packages/server/src/routes/pricing.ts` | Pricing suggestions (AI provider); uses fx conversion and margin from env. | Express, PricingService, env |
| `packages/server/src/routes/suppliers.ts` | CRUD suppliers; CSV import (idempotency, SupplierImportService). | Express, idempotency middleware |
| `packages/server/src/routes/dashboard.ts` | Dashboard aggregates (counts, recent activity). | Express, repos |
| `packages/server/src/routes/sourcing.ts` | CRUD sourcing requests; PUT enforces valid status transitions via `sourcingStatus`. | Express, sourcingStatus lib |
| `packages/server/src/routes/jobs.ts` | List system jobs (e.g. import jobs). | Express, SystemJobRepo |
| `packages/server/src/routes/vat.ts` | VAT calculation: GET/POST `/api/vat/calculate` (amountEur, inclVat, optional ratePct); returns netEur, vatEur, grossEur, ratePct; rate from settings if not provided. | vat.ts, SettingsRepo |
| `packages/server/src/routes/invoices.ts` | Invoices: POST (from-sale or full body), GET list (limit, cursor, from, to), GET :id. | InvoiceRepo, SettingsRepo, vat |

### Services

| File | Purpose | References |
|------|--------|------------|
| `packages/server/src/services/pricing/PricingService.ts` | Orchestrates AI pricing: provider selection (mock/openai), margin, FX (usdToEur). | fx.ts, env, providers |
| `packages/server/src/services/pricing/providers/IPricingProvider.ts` | Interface for pricing providers. | — |
| `packages/server/src/services/pricing/providers/MockPricingProvider.ts` | Mock pricing for tests/local. | IPricingProvider |
| `packages/server/src/services/pricing/providers/OpenAIProvider.ts` | OpenAI-based pricing. | OpenAI API, IPricingProvider |
| `packages/server/src/services/import/SupplierImportService.ts` | Parse supplier CSV, map columns, validate; create/update suppliers and items. | fx.ts, CSV parse |

---

## Shared — packages/shared

| File | Purpose | References |
|------|--------|------------|
| `packages/shared/src/index.ts` | Re-exports schemas. | — |
| `packages/shared/src/schemas/base.ts` | Base enums and `BaseDocSchema` (organisationId, createdAt, updatedAt, createdBy, updatedBy); currency, product/buying/sourcing/transaction/evaluation/supplier status enums. | Zod |
| `packages/shared/src/schemas/product.ts` | Product and ProductImage schemas. | base |
| `docs/INVENTORY_PRODUCT_AND_CSV_IMPORT.md` | Product fields and CSV/Excel column mapping for inventory import. | — |
| `packages/shared/src/schemas/buyingListItem.ts` | Buying list item schema. | base |
| `packages/shared/src/schemas/supplier.ts` | Supplier schema. | base |
| `packages/shared/src/schemas/supplierItem.ts` | Supplier item schema. | base |
| `packages/shared/src/schemas/sourcingRequest.ts` | Sourcing request schema. | base |
| `packages/shared/src/schemas/transaction.ts` | Transaction schema. | base |
| `packages/shared/src/schemas/evaluation.ts` | Evaluation schema. | base |
| `packages/shared/src/schemas/activityEvent.ts` | Activity event schema. | base |
| `packages/shared/src/schemas/settings.ts` | Settings schema (org/user; FX rate, optional vatRatePct). | base |
| `packages/shared/src/schemas/invoice.ts` | Invoice and InvoiceLineItem schemas (for accounting). | base |
| `packages/shared/src/schemas/systemJob.ts` | System job schema. | base |
| `packages/shared/src/schemas/index.ts` | Re-exports all schemas. | — |

---

## Frontend — src

### Entry & app

| File | Purpose | References |
|------|--------|------------|
| `src/main.tsx` | React root; mounts `LuxselleApp` with StrictMode; imports global styles. | React, Vite |
| `src/LuxselleApp.tsx` | App shell: React Query + Router, responsive navigation (mobile drawer / desktop tabs / ultra-wide side rail), deep-state breadcrumb mounting, Toaster, ErrorBoundary, and route definitions; includes legacy redirects and backend-config banner check via `GET /api/dashboard/status`. | react-router-dom, @tanstack/react-query, react-hot-toast, lucide-react |

### Lib

| File | Purpose | References |
|------|--------|------------|
| `src/lib/api.ts` | `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiPostFormData`; `API_BASE` (from `VITE_API_BASE` or `/api`); `ApiError`; parses API error body for message. | Fetch API |
| `src/lib/firebase.ts` | Firebase client init (config from env); used for auth/storage in frontend if needed. | Firebase JS SDK |
| `src/lib/placeholder.ts` | `PLACEHOLDER_IMAGE`, `PLACEHOLDER_IMAGE_SMALL`; fallback URLs for broken product/supplier images (used in `img` onError). | — |
| `src/lib/queryClient.ts` | TanStack Query client (default options). | @tanstack/react-query |

### Components

| File | Purpose | References |
|------|--------|------------|
| `src/components/ErrorBoundary.tsx` | Class-component error boundary; catches render errors and shows fallback UI. | React error boundaries |
| `src/components/layout/routeMeta.ts` | Route metadata + deep-state breadcrumb rules; includes dashboard `insight` URL contract and type guards. | lucide-react |
| `src/components/layout/DeepStateBreadcrumb.tsx` | Query-aware breadcrumb that only renders for configured deep-state route params. | react-router-dom |
| `src/components/navigation/MobileNavDrawer.tsx` | Mobile navigation drawer with grouped routes and route-change close behavior. | react-router-dom |
| `src/components/navigation/WideScreenSideRail.tsx` | Persistent side rail navigation for ultra-wide layouts (`2xl+`). | react-router-dom |
| `src/components/feedback/Skeleton.tsx` | Shared loading skeleton primitive (`text`, `rect`, `circle`). | Tailwind CSS |

### Pages (one folder per route)

| File | Purpose | References |
|------|--------|------------|
| `src/pages/Dashboard/DashboardView.tsx` | Dashboard overview with KPI/action cards, URL-driven insights drawer state (`insight` query param), and skeleton-first loading flow. | apiGet, react-router-dom |
| `src/pages/Dashboard/CommandBar.tsx` | Dashboard command/search bar. | — |
| `src/pages/Dashboard/DashboardSkeleton.tsx` | Layout-matched dashboard skeleton while dashboard aggregates are loading. | Skeleton primitive |
| `src/pages/Dashboard/InsightsDrawer.tsx` | Right-side manual insights drawer with keyboard close/focus containment and quick-link actions from existing dashboard data. | react-router-dom |
| `src/pages/Inventory/InventoryView.tsx` | Product list and filters. | apiGet, react-query |
| `src/pages/Inventory/ProductDetailDrawer.tsx` | Product detail side drawer. | apiGet, apiPut, apiPost |
| `src/pages/BuyBox/EvaluatorView.tsx` | Buy-box / evaluator UI. | apiGet, pricing API |
| `src/pages/SupplierHub/SupplierHubView.tsx` | Suppliers list and import. | apiGet, apiPostFormData |
| `src/pages/Sourcing/SourcingView.tsx` | Sourcing requests list and status. | apiGet, apiPut |
| `src/pages/BuyingList/BuyingListView.tsx` | Buying list CRUD. | apiGet, apiPost, apiPut, apiDelete |
| `src/pages/Jobs/JobsView.tsx` | System jobs list. | apiGet |
| `src/pages/Invoices/InvoicesView.tsx` | Invoices list and detail; view/print for accounting. | apiGet |

### Styles

| File | Purpose | References |
|------|--------|------------|
| `src/styles/index.css` | Global styles, Tailwind directives, shell visual tokens, motion utilities (`animate-in`, slide/fade), scrollbar hiding, and skeleton shimmer classes. | Tailwind CSS |

---

## Docs — docs/

| File | Purpose |
|------|---------|
| `docs/deploy/VERCEL.md` | Vercel deploy: env vars (VITE_*), root directory, production API, how to test. |

---

## Firebase project — firebase/

| File | Purpose | References |
|------|--------|------------|
| `firebase/firestore.rules` | Firestore security rules. | Firebase |
| `firebase/firestore.indexes.json` | Composite indexes for Firestore queries. | Firebase |
| `firebase/storage.rules` | Storage security rules. | Firebase |
| `firebase/firebase.json` | Firebase project config (emulators, etc.). | Firebase CLI |

---

## Tests

| File | Purpose | References |
|------|--------|------------|
| `packages/server/src/lib/fx.test.ts` | Unit tests for `usdToEur`. | Vitest |
| `packages/server/src/lib/sourcingStatus.test.ts` | Unit tests for sourcing status transitions. | Vitest |
| `packages/server/src/services/pricing/PricingService.test.ts` | Pricing service tests. | Vitest |
| `packages/server/src/services/import/SupplierImportService.test.ts` | CSV import and mapping tests. | Vitest |
| `tests/e2e/evaluator.spec.ts` | E2E smoke (evaluator, buying list, invoices page). | Playwright |
| `tests/e2e/dashboard-shell.spec.ts` | E2E shell coverage: mobile drawer, desktop/ultra-wide nav variants, deep-state breadcrumb visibility, dashboard skeleton, insights drawer URL sync. | Playwright |

---

*Last updated to match the codebase structure. When adding new modules, add a row here and keep file-level comments in sync.*
