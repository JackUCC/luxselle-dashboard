# Luxselle Dashboard — Iteration 5 Documentation Evidence Pack

> **Author:** Jack Kelleher (JK122)
> **Date:** February 2026
> **Purpose:** Complete per-page code evidence, per-widget deep dives, test proof, and AI usage traceability for Iteration 5 submission.

---

## Table of Contents

- [1. Global Code Context](#1-global-code-context)
  - [1A. Repo Map](#1a-repo-map)
  - [1B. Run and Test Proof](#1b-run-and-test-proof)
  - [1C. Architecture Truth Sources](#1c-architecture-truth-sources)
  - [1D. Data Model Snapshot](#1d-data-model-snapshot)
  - [1E. API Inventory](#1e-api-inventory)
- [2. Per-Page Evidence Packs](#2-per-page-evidence-packs)
  - [2.1 Dashboard (Overview)](#21-dashboard-overview)
  - [2.2 Inventory](#22-inventory)
  - [2.3 Buy Box (Evaluator)](#23-buy-box-evaluator)
  - [2.4 Supplier Hub](#24-supplier-hub)
  - [2.5 Sourcing](#25-sourcing)
  - [2.6 Buying List](#26-buying-list)
  - [2.7 Jobs](#27-jobs)
  - [2.8 Invoices](#28-invoices)
  - [2.9 Market Research](#29-market-research)
  - [2.10 Retail Price](#210-retail-price)
  - [2.11 Serial Check](#211-serial-check)
- [3. Per-Widget Deep Dives](#3-per-widget-deep-dives)
  - [3.1 EUR to JPY Converter](#31-eur-to-jpy-converter)
  - [3.2 Landed Cost Widget](#32-landed-cost-widget)
  - [3.3 Calculator Widget (Advanced Landed Cost)](#33-calculator-widget-advanced-landed-cost)
  - [3.4 Serial Check Widget](#34-serial-check-widget)
  - [3.5 AI Prompt Bar](#35-ai-prompt-bar)
  - [3.6 Auction Links Widget](#36-auction-links-widget)
- [4. Test Proof](#4-test-proof)
  - [4.1 Unit Tests](#41-unit-tests)
  - [4.2 E2E Tests](#42-e2e-tests)
- [5. AI Usage Notes](#5-ai-usage-notes)
- [6. Screenshot Checklist](#6-screenshot-checklist)

---

## 1. Global Code Context

### 1A. Repo Map

**Monorepo type:** NPM workspaces (not pnpm).

**Workspace config** (`package.json` root):

```json
"workspaces": ["packages/server", "packages/shared"]
```

**File tree** (3 levels, essential only):

```
luxselle-dashboard/
├── src/                              # Frontend (React + Vite + Tailwind)
│   ├── LuxselleApp.tsx               # App shell: routing, providers, layout
│   ├── lib/                          # Shared client utilities
│   │   ├── api.ts                    # API client (apiGet/Post/Put/Delete)
│   │   ├── firebase.ts              # Firebase client config
│   │   ├── fxRate.ts                # EUR→JPY live rate fetcher
│   │   ├── landedCost.ts            # Landed cost forward + reverse calc
│   │   ├── serialDateDecoder.ts     # LV/Chanel serial decoder
│   │   ├── formatters.ts           # Currency + date formatting
│   │   ├── queryClient.ts          # TanStack Query client + keys
│   │   └── ServerStatusContext.tsx  # Backend health context
│   ├── pages/                        # One folder per route
│   │   ├── Dashboard/DashboardView.tsx
│   │   ├── Inventory/InventoryView.tsx
│   │   ├── Inventory/ProductDetailDrawer.tsx
│   │   ├── Inventory/AddProductDrawer.tsx
│   │   ├── Inventory/ImportInventoryDrawer.tsx
│   │   ├── BuyBox/EvaluatorView.tsx
│   │   ├── SupplierHub/SupplierHubView.tsx
│   │   ├── Sourcing/SourcingView.tsx
│   │   ├── BuyingList/BuyingListView.tsx
│   │   ├── Jobs/JobsView.tsx
│   │   ├── Invoices/InvoicesView.tsx
│   │   ├── MarketResearch/MarketResearchView.tsx
│   │   ├── RetailPrice/RetailPriceView.tsx
│   │   └── SerialCheck/SerialCheckView.tsx
│   ├── components/
│   │   ├── widgets/                  # Dashboard + Buy Box widgets
│   │   │   ├── EurToYenWidget.tsx
│   │   │   ├── LandedCostWidget.tsx
│   │   │   ├── CalculatorWidget.tsx
│   │   │   ├── SerialCheckWidget.tsx
│   │   │   ├── AiPromptBar.tsx
│   │   │   ├── AiInsightsWidget.tsx
│   │   │   └── AuctionLinksWidget.tsx
│   │   ├── navigation/
│   │   │   ├── MobileNavDrawer.tsx
│   │   │   ├── WideScreenSideRail.tsx
│   │   │   └── navGroups.ts
│   │   ├── layout/
│   │   │   ├── routeMeta.ts          # Route definitions + deep-state rules
│   │   │   └── DeepStateBreadcrumb.tsx
│   │   ├── feedback/Skeleton.tsx     # Loading skeleton
│   │   └── ErrorBoundary.tsx         # React error boundary
│   ├── types/dashboard.ts           # KPIs + ProfitSummary types
│   └── styles/index.css             # Tailwind global styles
│
├── packages/
│   ├── server/                       # Express API (@luxselle/server)
│   │   └── src/
│   │       ├── server.ts             # App entry: middleware + routes + error handler
│   │       ├── config/
│   │       │   ├── env.ts            # Environment variable parsing
│   │       │   └── firebase.ts       # Firebase Admin SDK init
│   │       ├── routes/               # 12 route modules
│   │       │   ├── dashboard.ts      # /api/dashboard/*
│   │       │   ├── products.ts       # /api/products/*
│   │       │   ├── buying-list.ts    # /api/buying-list/*
│   │       │   ├── pricing.ts        # /api/pricing/*
│   │       │   ├── suppliers.ts      # /api/suppliers/*
│   │       │   ├── sourcing.ts       # /api/sourcing/*
│   │       │   ├── jobs.ts           # /api/jobs/*
│   │       │   ├── invoices.ts       # /api/invoices/*
│   │       │   ├── settings.ts       # /api/settings
│   │       │   ├── vat.ts            # /api/vat/*
│   │       │   ├── market-research.ts # /api/market-research/*
│   │       │   └── ai.ts            # /api/ai/*
│   │       ├── services/             # Business logic
│   │       │   ├── pricing/PricingService.ts
│   │       │   ├── import/SupplierImportService.ts
│   │       │   ├── import/SupplierEmailSyncService.ts
│   │       │   ├── ai/AiService.ts
│   │       │   ├── market-research/MarketResearchService.ts
│   │       │   ├── InvoicePdfService.ts
│   │       │   └── JobRunner.ts
│   │       ├── repos/                # Firestore data access
│   │       │   ├── BaseRepo.ts       # Generic CRUD (all repos extend this)
│   │       │   ├── ProductRepo.ts
│   │       │   ├── BuyingListItemRepo.ts
│   │       │   ├── SupplierRepo.ts
│   │       │   ├── SupplierItemRepo.ts
│   │       │   ├── SourcingRequestRepo.ts
│   │       │   ├── TransactionRepo.ts
│   │       │   ├── EvaluationRepo.ts
│   │       │   ├── ActivityEventRepo.ts
│   │       │   ├── InvoiceRepo.ts
│   │       │   ├── SystemJobRepo.ts
│   │       │   └── SettingsRepo.ts
│   │       ├── lib/                  # Shared server utilities
│   │       │   ├── errors.ts         # API error codes + formatApiError
│   │       │   ├── fx.ts            # USD→EUR conversion
│   │       │   ├── vat.ts           # VAT net↔gross helpers
│   │       │   ├── sourcingStatus.ts # Sourcing state machine
│   │       │   └── csvProductParser.ts # CSV→product mapper
│   │       └── middleware/
│   │           ├── requestId.ts      # Request ID + structured logging
│   │           ├── auth.ts          # Firebase auth (deferred)
│   │           └── idempotency.ts   # Idempotency key middleware
│   │
│   └── shared/                       # Shared Zod schemas (@luxselle/shared)
│       └── src/schemas/
│           ├── index.ts              # Barrel re-export
│           ├── base.ts              # BaseDocSchema, status enums
│           ├── product.ts           # ProductSchema, ProductImageSchema
│           ├── supplier.ts          # SupplierSchema
│           ├── supplierItem.ts      # SupplierItemSchema
│           ├── buyingListItem.ts    # BuyingListItemSchema
│           ├── transaction.ts       # TransactionSchema
│           ├── evaluation.ts        # EvaluationSchema
│           ├── sourcingRequest.ts   # SourcingRequestSchema
│           ├── invoice.ts           # InvoiceSchema
│           ├── systemJob.ts         # SystemJobSchema
│           ├── activityEvent.ts     # ActivityEventSchema
│           ├── pricing.ts           # Landed cost, platform, market schemas
│           └── settings.ts          # SettingsSchema (singleton)
│
├── config/                           # Build + test configs
│   ├── vite.config.ts               # Vite: React plugin, @shared alias, /api proxy
│   ├── vitest.config.ts             # Vitest: node env, test paths
│   └── playwright.config.cjs        # Playwright: baseURL, webServer
│
├── firebase/                         # Firebase project config
│   ├── firebase.json                # Emulator ports (Firestore 8082, Storage 9198)
│   ├── firestore.rules
│   ├── firestore.indexes.json
│   └── storage.rules
│
├── tests/e2e/                        # Playwright E2E tests
│   ├── evaluator.spec.ts
│   ├── dashboard-shell.spec.ts
│   ├── inventory.spec.ts
│   ├── sourcing.spec.ts
│   └── market-research.spec.ts
│
├── docs/                             # Documentation
├── package.json                      # Root: workspaces, scripts
├── tsconfig.json                     # Root TS config
├── tailwind.config.js               # Tailwind theme (lux palette, glass)
└── .env.example                     # All env variables documented
```

### 1B. Run and Test Proof

**Root scripts** (from `package.json`):

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | concurrently emulators + server + client | Start everything |
| `npm run dev:client` | `vite --config config/vite.config.ts` | Frontend only |
| `npm run emulators` | `firebase emulators:start --only firestore,storage` | Local Firebase |
| `npm run seed` | `npm run seed --workspace=@luxselle/server` | Seed test data |
| `npm run test` | `vitest --run --config config/vitest.config.ts` | Unit tests |
| `npm run test:e2e` | `playwright test --config config/playwright.config.cjs` | E2E tests |
| `npm run build` | `vite build` | Production build |

**Emulator configuration** (from `firebase/firebase.json`):

```json
{
  "emulators": {
    "firestore": { "port": 8082 },
    "storage":   { "port": 9198 },
    "ui":        { "enabled": true, "port": 4010 },
    "hub":       { "port": 4402 }
  }
}
```

**Vitest config** (from `config/vitest.config.ts`):

```typescript
test: {
  environment: 'node',
  include: [
    'packages/server/src/**/*.{test,spec}.ts',
    'src/lib/**/*.{test,spec}.ts'
  ],
  testTimeout: 10000,
}
```

**Playwright config** (from `config/playwright.config.cjs`):

```javascript
{
  testDir: 'tests/e2e',
  timeout: 120000,
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
}
```

### 1C. Architecture Truth Sources

#### API Client (`src/lib/api.ts`)

The frontend uses a single shared `request()` wrapper that adds the base URL, parses the standard error shape, and throws typed `ApiError` instances:

```typescript
// src/lib/api.ts — Core fetch wrapper (lines 44-63)

export const API_BASE = normalizeApiBase(import.meta.env.VITE_API_BASE)

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options)
  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')
  if (!response.ok) {
    const message = await getErrorMessage(response)
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  if (!isJson) {
    const text = await response.text()
    if (/^\s*<!doctype/i.test(text))
      throw new ApiError('Backend URL not set...', response.status)
    throw new ApiError(text || 'Invalid response', response.status)
  }
  return response.json() as Promise<T>
}

export function apiGet<T>(path: string) { return request<T>(path) }
export function apiPost<T>(path: string, body: unknown) { /* ... */ }
export function apiPut<T>(path: string, body: unknown) { /* ... */ }
export function apiDelete(path: string) { /* ... */ }
export async function apiPostFormData<T>(path: string, formData: FormData) { /* ... */ }
```

**Related:** Unit test at `src/lib/api.test.ts` validates `normalizeApiBase()`.

#### Error Envelope (`packages/server/src/lib/errors.ts`)

All API errors follow a single JSON shape:

```typescript
// packages/server/src/lib/errors.ts — Standard error codes and formatter

export const API_ERROR_CODES = {
  VALIDATION: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
} as const

export function formatApiError(
  code: string, message: string, details?: object
): { error: { code: string; message: string; details?: object } } {
  return { error: details ? { code, message, details } : { code, message } }
}
```

**Example error response:**

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Validation error: brand: Required" } }
```

#### Global Error Handler (`packages/server/src/server.ts`, lines 85-106)

```typescript
// Wired as final middleware in server.ts
app.use((err, req, res, _next) => {
  if (err instanceof ZodError) {
    // Zod validation → 400 with flattened details
    res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, message, flat))
    return
  }
  // All other errors → 500
  res.status(500).json(formatApiError(API_ERROR_CODES.INTERNAL, 'Internal server error'))
})
```

#### Firebase Initialisation

**Client** (`src/lib/firebase.ts`):

```typescript
export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'luxselle-dashboard',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'luxselle-dashboard.firebasestorage.app',
}
```

**Server** (`packages/server/src/config/firebase.ts`) — key excerpt:

```typescript
// Emulator detection
if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST = env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8082'
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9198'
}
// Named database support (eur3 for production)
const databaseId = useEmulator ? undefined
  : (env.FIRESTORE_DATABASE_ID !== '(default)' ? env.FIRESTORE_DATABASE_ID : undefined)
const db = databaseId ? getFirestore(adminApp, databaseId) : getFirestore(adminApp)
export { adminApp, db, storage }
```

#### Shared Zod Schemas (`packages/shared/src/schemas/index.ts`)

Barrel file re-exporting 14 schema modules:

```typescript
export * from './base'           // BaseDocSchema, status enums
export * from './product'        // ProductSchema, ProductImageSchema
export * from './supplier'       // SupplierSchema
export * from './supplierItem'   // SupplierItemSchema
export * from './buyingListItem' // BuyingListItemSchema
export * from './transaction'    // TransactionSchema
export * from './evaluation'     // EvaluationSchema
export * from './pricing'        // LandedCostSnapshot, PricingComparable, etc.
export * from './activityEvent'  // ActivityEventSchema
export * from './sourcingRequest'// SourcingRequestSchema
export * from './settings'       // SettingsSchema
export * from './invoice'        // InvoiceSchema, InvoiceLineItemSchema
export * from './systemJob'      // SystemJobSchema
```

### 1D. Data Model Snapshot

Each Firestore collection maps to a Zod schema in `packages/shared/src/schemas/`. Example document shapes:

**`products`** (schema: `ProductSchema` in `product.ts`):

```json
{
  "organisationId": "default",
  "brand": "Chanel",
  "model": "Classic Flap",
  "title": "Chanel Classic Flap Medium Caviar Black",
  "sku": "hk3230M",
  "category": "handbag",
  "condition": "excellent",
  "colour": "Black",
  "costPriceEur": 1084,
  "sellPriceEur": 1600,
  "customsEur": 32.52,
  "vatEur": 249.32,
  "currency": "EUR",
  "status": "in_stock",
  "quantity": 1,
  "images": [{ "id": "uuid", "url": "https://...", "path": "products/img.jpg", "createdAt": "..." }],
  "imageUrls": [],
  "notes": "",
  "createdAt": "2026-02-15T10:00:00.000Z",
  "updatedAt": "2026-02-15T10:00:00.000Z"
}
```

**`buyingListItems`** (schema: `BuyingListItemSchema` in `buyingListItem.ts`):

```json
{
  "organisationId": "default",
  "sourceType": "evaluator",
  "evaluationId": "eval-abc",
  "brand": "Chanel",
  "model": "Classic Flap",
  "targetBuyPriceEur": 3200,
  "status": "pending",
  "landedCostSnapshot": { "hammerEur": 2500, "landedCostEur": 3200, "..." : "..." },
  "createdAt": "...",
  "updatedAt": "..."
}
```

**`sourcingRequests`** (schema: `SourcingRequestSchema`):

```json
{
  "customerName": "John Smith",
  "queryText": "Chanel Classic Flap Black Caviar",
  "brand": "Chanel",
  "budget": 5000,
  "priority": "high",
  "status": "open",
  "notes": "",
  "createdAt": "...",
  "updatedAt": "..."
}
```

**`settings`** (singleton, schema: `SettingsSchema`):

```json
{
  "organisationId": "default",
  "baseCurrency": "EUR",
  "targetMarginPct": 35,
  "lowStockThreshold": 2,
  "fxUsdToEur": 0.92,
  "vatRatePct": 20,
  "pricingMarketCountryDefault": "IE",
  "pricingMarketMode": "ie_first_eu_fallback",
  "auctionPlatforms": [{ "id": "...", "name": "AUCNET", "buyerPremiumPct": 10, "..." : "..." }]
}
```

**Other collections:** `transactions`, `suppliers`, `supplierItems`, `evaluations`, `invoices`, `systemJobs`, `activityEvents`, `idempotency_keys`.

**Key Firestore index** (`firebase/firestore.indexes.json`):

```json
{ "collectionGroup": "transactions",
  "fields": [
    { "fieldPath": "productId", "order": "ASCENDING" },
    { "fieldPath": "occurredAt", "order": "DESCENDING" }
  ] }
```

### 1E. API Inventory

All routes mounted in `packages/server/src/server.ts` (lines 42-53):

| Prefix | Module | Endpoints |
|--------|--------|-----------|
| `/api/health` | inline | 1 (GET) |
| `/api/products` | `routes/products.ts` | 12 |
| `/api/dashboard` | `routes/dashboard.ts` | 4 |
| `/api/buying-list` | `routes/buying-list.ts` | 7 |
| `/api/pricing` | `routes/pricing.ts` | 4 |
| `/api/suppliers` | `routes/suppliers.ts` | 11 |
| `/api/sourcing` | `routes/sourcing.ts` | 5 |
| `/api/jobs` | `routes/jobs.ts` | 4 |
| `/api/invoices` | `routes/invoices.ts` | 5 |
| `/api/settings` | `routes/settings.ts` | 2 |
| `/api/vat` | `routes/vat.ts` | 2 |
| `/api/market-research` | `routes/market-research.ts` | 3 |
| `/api/ai` | `routes/ai.ts` | 4 |
| **Total** | | **64** |

---

## 2. Per-Page Evidence Packs

---

### 2.1 Dashboard (Overview)

**Page identity:**
- Nav name: Overview
- Route: `/`
- Main file: `src/pages/Dashboard/DashboardView.tsx`

#### A. Frontend Key Logic

**Data fetching** (lines 120-135):

```typescript
// src/pages/Dashboard/DashboardView.tsx — parallel API calls for KPIs + profit
const loadData = async (isRefresh = false) => {
  if (!isRefresh) setIsLoading(true)
  try {
    const [kpisRes, profitRes] = await Promise.all([
      apiGet<{ data: KPIs }>('/dashboard/kpis'),
      apiGet<{ data: ProfitSummary }>('/dashboard/profit-summary'),
    ])
    setKpis(kpisRes.data)
    setProfit(profitRes.data)
    setError(null)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load dashboard'
    setError(message)
    toast.error(message)
  } finally {
    if (!isRefresh) setIsLoading(false)
  }
}
```

**Loading/empty/error states** (lines 161-180):

```typescript
{isLoading ? (
  <DashboardSkeleton />           // Skeleton shimmer component
) : error ? (
  <div className="lux-card p-8 text-center">
    <p className="text-rose-600 font-medium">{error}</p>
    <button onClick={handleRefresh} className="lux-btn-secondary mt-4">Retry</button>
  </div>
) : (
  // KPIs + Quick tools + Profit sections
)}
```

**Toast triggers:**
- `toast.success('Dashboard refreshed')` on manual refresh (line 116)
- `toast.error(message)` on load failure (line 135)

**Child components:**
- `DashboardSkeleton` (`src/pages/Dashboard/DashboardSkeleton.tsx`) — loading state
- `AiPromptBar` (`src/components/widgets/AiPromptBar.tsx`) — AI command bar
- `LandedCostWidget` — quick cost calculator
- `SerialCheckWidget` — serial decoder
- `EurToYenWidget` — live FX converter
- `AuctionLinksWidget` — auction site links

#### B. Backend Key Logic

**GET /api/dashboard/kpis** (`packages/server/src/routes/dashboard.ts`, lines 28-72):

```typescript
router.get('/kpis', async (_req, res, next) => {
  const [products, buyingListItems, sourcingRequests, settings] = await Promise.all([
    productRepo.list(), buyingListRepo.list(), sourcingRepo.list(), settingsRepo.getSettings(),
  ])
  const totalInventoryValue = products
    .filter((p) => p.status === 'in_stock')
    .reduce((sum, p) => sum + p.costPriceEur * p.quantity, 0)
  // ... totalInventoryPotentialValue, pendingBuyListValue, activeSourcingPipeline, lowStockAlerts
  res.json({ data: { totalInventoryValue, totalInventoryPotentialValue, ... } })
})
```

**GET /api/dashboard/profit-summary** (lines 108-155):

```typescript
router.get('/profit-summary', async (_req, res, next) => {
  const [products, transactions] = await Promise.all([
    productRepo.list(), transactionRepo.list(),
  ])
  const soldProducts = products.filter((p) => p.status === 'sold')
  const totalCost = soldProducts.reduce((sum, p) => sum + p.costPriceEur, 0)
  const totalRevenue = soldProducts.reduce((sum, p) => sum + p.sellPriceEur, 0)
  const totalProfit = actualRevenue - totalCost
  const marginPct = actualRevenue > 0 ? (totalProfit / actualRevenue) * 100 : 0
  res.json({ data: { totalCost, totalRevenue, totalProfit, marginPct, itemsSold, avgMarginPct } })
})
```

**Example success response (KPIs):**

```json
{
  "data": {
    "totalInventoryValue": 120000,
    "totalInventoryPotentialValue": 165000,
    "pendingBuyListValue": 20000,
    "activeSourcingPipeline": 15000,
    "lowStockAlerts": 2
  }
}
```

#### C. Tests

- **E2E:** `tests/e2e/dashboard-shell.spec.ts` — skeleton appears during delayed load, resolves to KPIs; mobile nav; desktop nav; side rail; breadcrumbs; low-stock filter via URL.

#### D. Screenshots

1. Default state: Dashboard loaded with KPIs, quick tools grid, profit bars
2. Worked state: After refresh, showing updated KPI values with animated counters
3. Edge state: Loading skeleton (`DashboardSkeleton` component visible)

---

### 2.2 Inventory

**Page identity:**
- Nav name: Inventory
- Route: `/inventory`
- Main file: `src/pages/Inventory/InventoryView.tsx`

#### A. Frontend Key Logic

**Data fetching** (line ~210):

```typescript
const loadProducts = async () => {
  setLoading(true)
  try {
    const res = await apiGet<{ data: ProductWithId[] }>('/products?limit=500')
    setProducts(res.data)
  } catch (err) { /* ... */ }
  finally { setLoading(false) }
}
```

**Virtual scrolling** for large lists (lines 375-381):

```typescript
const virtualizer = useVirtualizer({
  count: filtered.length,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => 56,
  overscan: 10,
})
```

**Loading/empty/error states** (lines 574-598):

```typescript
{loading ? (
  <div className="flex items-center justify-center py-24">
    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    <span>Loading inventory...</span>
  </div>
) : error ? (
  <div className="lux-card p-8 text-center text-rose-600">{error}</div>
) : filtered.length === 0 ? (
  <div className="py-24 text-center">
    <Package className="mx-auto h-10 w-10 text-gray-300" />
    <p>No products found</p>
    <button onClick={() => setAddDrawerOpen(true)}>Add your first product</button>
  </div>
) : ( /* table or grid */ )}
```

**Toast triggers:**
- `toast.success('Exported X items to CSV')` (line 284)
- `toast.success('Product deleted')` (line 718)
- `toast.error(...)` on API failures

**Child components:**
- `ProductDetailDrawer` — side drawer with tabs: Images, Details, Financials, History, Notes
- `AddProductDrawer` — form to create new products
- `ImportInventoryDrawer` — CSV/Excel/PDF import

**Features:** Table + grid view toggle, search, brand/status/low-stock/missing-info filters, CSV export, URL state via `useSearchParams`.

#### B. Backend Key Logic

**Products API** (`packages/server/src/routes/products.ts`) — 12 endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/products` | List with filters |
| GET | `/api/products/:id` | Single product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| POST | `/api/products/import` | CSV/XLSX import |
| POST | `/api/products/import-pdf` | PDF import |
| POST | `/api/products/clear` | Clear all products |
| POST | `/api/products/:id/images` | Upload image |
| DELETE | `/api/products/:id/images/:imageId` | Delete image |
| GET | `/api/products/:id/transactions` | List transactions |
| POST | `/api/products/:id/transactions` | Record transaction |

**Validation schema** (local to route file):

```typescript
const ProductInputSchema = z.object({
  brand: z.string(), model: z.string(), costPriceEur: z.coerce.number(),
  sellPriceEur: z.coerce.number(), status: ProductStatusSchema.optional().default('in_stock'),
  quantity: z.coerce.number().int().min(0).optional().default(1),
  // ... category, condition, colour, sku, title, notes, customsEur, vatEur
})
```

**CSV import** uses `mapCsvRowToProductPayload()` from `packages/server/src/lib/csvProductParser.ts`.

**Example success response:**

```json
{ "data": { "id": "abc123", "brand": "Chanel", "model": "Classic Flap", "costPriceEur": 1200, "..." : "..." } }
```

#### C. Tests

- **Unit:** `packages/server/src/lib/csvProductParser.test.ts` — 10 tests covering CSV mapping, aliases, defaults, AI column mapping
- **E2E:** `tests/e2e/inventory.spec.ts` — clear filters, table/grid toggle, product prices display
- **E2E:** `tests/e2e/evaluator.spec.ts` — receive flow creates product in inventory

#### D. Screenshots

1. Default state: Inventory table with products, filter bar, search
2. Worked state: Product detail drawer open (showing tabs)
3. Edge state: Empty inventory with "Add your first product" prompt

---

### 2.3 Buy Box (Evaluator)

**Page identity:**
- Nav name: Buy Box
- Route: `/buy-box`
- Main file: `src/pages/BuyBox/EvaluatorView.tsx`

#### A. Frontend Key Logic

**Price check flow** (lines 85-110):

```typescript
const handleResearch = async () => {
  setLoading(true)
  try {
    const response = await apiPost<{ data: PriceCheckResult }>('/pricing/price-check', {
      query: searchQuery,
    })
    setResult(response.data)
    toast.success('Market research complete')
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Research failed')
  } finally { setLoading(false) }
}
```

**Image analysis** (lines 65-83):

```typescript
const handleImageAnalysis = async (file: File) => {
  const formData = new FormData()
  formData.append('image', file)
  const response = await apiPostFormData<{ data: { searchQuery: string } }>(
    '/pricing/analyze-image', formData
  )
  setSearchQuery(response.data.searchQuery)
  toast.success('Image analyzed — search updated')
}
```

**Add to buying list** (lines 120-140):

```typescript
const handleAddToBuyList = async () => {
  await apiPost('/buying-list', {
    sourceType: 'evaluator',
    brand: result.brand, model: result.model,
    targetBuyPriceEur: result.maxBuyEur,
    status: 'pending',
  })
  toast.success('Added to buying list')
  setResult(null); setSearchQuery('')
}
```

**Toast triggers:** Image analyzed, research complete, added to buying list, error messages.

#### B. Backend Key Logic

**POST /api/pricing/price-check** (`packages/server/src/routes/pricing.ts`):
- Calls `PricingService.analyse()` which uses either `MockPricingProvider` or `OpenAIProvider`
- Returns `estimatedRetailEur`, `maxBuyPriceEur`, `confidence`, `comps[]`, `marketSummary`

**Max buy price formula** (`PricingService.ts`):

```
maxBuyPriceEur = Math.round(estimatedRetailEur * (1 - targetMarginPct / 100))
```

**Example response:**

```json
{
  "data": {
    "averageSellingPriceEur": 5000,
    "maxBuyEur": 3200,
    "maxBidEur": 2990,
    "comps": [{ "title": "Chanel Classic Flap", "price": 4800, "source": "Vestiaire" }]
  }
}
```

#### C. Tests

- **Unit:** `packages/server/src/services/pricing/PricingService.test.ts` — 10 tests: margin calc, edge cases, historical avg, provider selection, IE-first market policy, landed cost breakdown
- **E2E:** `tests/e2e/evaluator.spec.ts` — full flow: search → results → add to buy list → receive into inventory

#### D. Screenshots

1. Default state: Search form with "Research market" button
2. Worked state: Results showing avg selling price, max buy/bid, comparables
3. Edge state: "Enter an item name to search" validation message

---

### 2.4 Supplier Hub

**Page identity:**
- Nav name: Supplier Hub
- Route: `/supplier-hub`
- Main file: `src/pages/SupplierHub/SupplierHubView.tsx`

#### A. Frontend Key Logic

**Data fetching** (loads suppliers, items, email status in parallel):

```typescript
const [suppliersRes, itemsRes, emailStatusRes] = await Promise.all([
  apiGet<{ data: Supplier[] }>('/suppliers'),
  apiGet<{ data: SupplierItem[] }>('/suppliers/items/all'),
  apiGet<{ data: EmailSyncStatus }>('/suppliers/email/status'),
])
```

**CSV import with preview:**

```typescript
// Preview file structure
const preview = await apiPostFormData('/suppliers/import/preview', formData)
// Save template mapping
await apiPut(`/suppliers/${supplierId}/import-template`, { importTemplate: template })
// Execute import
const result = await apiPostFormData('/suppliers/import', formData)
toast.success('Import completed successfully')
```

**Features:** Supplier grid, item gallery with filters, CSV/XLSX import with column mapping preview, email sync, import template configuration.

#### B. Backend Key Logic

**Suppliers API** (`packages/server/src/routes/suppliers.ts`) — 11 endpoints including:
- GET/POST/PUT/DELETE for suppliers
- GET items (all + per-supplier)
- POST import (CSV), POST import/preview
- PUT import-template
- GET/POST email sync

**Import service** (`packages/server/src/services/import/SupplierImportService.ts`):
- `previewImportFile()` — parse CSV/XLSX, return headers + sample rows
- `importWithTemplate()` — map rows via column mapping, create SupplierItems, track job

**Email sync** (`packages/server/src/services/import/SupplierEmailSyncService.ts`):
- Gmail API integration, supplier matching by `sourceEmails`, attachment parsing, dedupe

#### C. Tests

- **Unit:** `packages/server/src/services/import/SupplierImportService.test.ts` — CSV parsing, BST format
- **Unit:** `packages/server/src/services/import/SupplierImportService.template.test.ts` — template mapping, CSV/XLSX preview, FX conversion
- **Unit:** `packages/server/src/services/import/SupplierEmailSyncService.test.ts` — email sync, dedupe

#### D. Screenshots

1. Default state: Supplier grid cards with item gallery below
2. Worked state: Import preview modal showing column mapping
3. Edge state: Empty items with "No items match your filters" message

---

### 2.5 Sourcing

**Page identity:**
- Nav name: Sourcing
- Route: `/sourcing`
- Main file: `src/pages/Sourcing/SourcingView.tsx`

#### A. Frontend Key Logic

**Create request** (lines ~110-135):

```typescript
const handleCreate = async (formData: SourcingInput) => {
  await apiPost('/sourcing', formData)
  toast.success('Sourcing request created')
  loadRequests()
}
```

**Status update** (lines ~155-175):

```typescript
const handleUpdate = async (id: string, updates: Partial<SourcingRequest>) => {
  await apiPut(`/sourcing/${id}`, updates)
  toast.success('Sourcing request updated')
}
```

**Features:** Create/edit modals, status filter dropdown, priority badges, status transition UI.

#### B. Backend Key Logic

**Status transition validation** (`packages/server/src/routes/sourcing.ts`, lines 160-181):

```typescript
// PUT /api/sourcing/:id — enforces valid status transitions
if (input.status !== undefined) {
  const valid = isValidSourcingTransition(current.status, input.status)
  if (!valid) {
    res.status(400).json(formatApiError(API_ERROR_CODES.BAD_REQUEST,
      'Invalid status transition', { from: current.status, to: input.status }))
    return
  }
}
```

**State machine** (`packages/server/src/lib/sourcingStatus.ts`):

```typescript
// Valid transitions: open → sourcing → sourced → fulfilled | lost
const ALLOWED: Record<SourcingStatus, SourcingStatus[]> = {
  open: ['sourcing'],
  sourcing: ['sourced'],
  sourced: ['fulfilled', 'lost'],
  fulfilled: [],
  lost: [],
}
export function isValidSourcingTransition(from, to): boolean {
  if (from === to) return true
  return ALLOWED[from]?.includes(to) ?? false
}
```

**Example error response (invalid transition):**

```json
{ "error": { "code": "BAD_REQUEST", "message": "Invalid status transition", "details": { "from": "open", "to": "fulfilled" } } }
```

#### C. Tests

- **Unit:** `packages/server/src/lib/sourcingStatus.test.ts` — 11 tests: valid transitions (open→sourcing, sourcing→sourced, sourced→fulfilled/lost), invalid transitions (open→fulfilled, sourcing→open, fulfilled→sourced, lost→open), no-op same-status, `getValidNextStatuses()`
- **E2E:** `tests/e2e/sourcing.spec.ts` — new request creation flow

#### D. Screenshots

1. Default state: Sourcing request list with status badges
2. Worked state: Edit modal with status transition dropdown
3. Edge state: Empty state "No sourcing requests"

---

### 2.6 Buying List

**Page identity:**
- Nav name: Buying List
- Route: `/buying-list`
- Main file: `src/pages/BuyingList/BuyingListView.tsx`

#### A. Frontend Key Logic

**Receive flow** (lines ~105-125):

```typescript
const handleReceive = async (id: string) => {
  await apiPost(`/buying-list/${id}/receive`, {})
  toast.success('Item received into inventory')
  queryClient.invalidateQueries({ queryKey: ['buyingList'] })
  navigate('/inventory')
}
```

**Bulk message generation** (lines ~140-150):

```typescript
const handleCopyMessage = (item: BuyingListItem) => {
  const message = `Hi, interested in: ${item.brand} ${item.model}...`
  navigator.clipboard.writeText(message)
  toast.success(`Message for ${item.brand} copied!`)
}
```

**Features:** List and bulk order views, status filtering, receive flow with inventory navigation, WhatsApp/email message generation, clear list.

#### B. Backend Key Logic

**POST /api/buying-list/:id/receive** (`packages/server/src/routes/buying-list.ts`, lines 208-311):

Uses an atomic Firestore transaction to:
1. Validate item exists and is not already received
2. Create product document (status: `in_stock`)
3. Create purchase transaction
4. Create activity event
5. Update buying list item status to `received`

```typescript
const result = await db.runTransaction(async (transaction) => {
  const itemDoc = await transaction.get(db.collection('buying_list_items').doc(id))
  if (item.status === 'received') throw new Error('ALREADY_RECEIVED')
  // atomic: create product + transaction + activity + update status
  return { buyingListItem, product }
})
```

**Example response:**

```json
{
  "data": {
    "buyingListItem": { "id": "...", "status": "received" },
    "product": { "id": "new-product-id", "brand": "Chanel", "status": "in_stock" }
  }
}
```

#### C. Tests

- **E2E:** `tests/e2e/evaluator.spec.ts` — full evaluate→add→receive→inventory flow; double-receive returns 400 "already received"; bulk order view rendering

#### D. Screenshots

1. Default state: Buying list table with status badges and receive buttons
2. Worked state: Bulk order view with message preview
3. Edge state: Empty buying list "Use the Evaluator to add items"

---

### 2.7 Jobs

**Page identity:**
- Nav name: Jobs
- Route: `/jobs`
- Main file: `src/pages/Jobs/JobsView.tsx`

#### A. Frontend Key Logic

**Data fetching and retry** (lines ~120-160):

```typescript
const loadJobs = async () => {
  const res = await apiGet<{ data: SystemJob[] }>('/jobs?limit=100')
  setJobs(res.data)
}
const handleRetry = async (jobId: string) => {
  await apiPost(`/jobs/${jobId}/retry`, {})
  toast.success('Job queued for retry')
  loadJobs()
}
```

**Features:** Status filtering, job detail drawer with progress bars, error details, input metadata, retry button.

#### B. Backend Key Logic

**Jobs API** (`packages/server/src/routes/jobs.ts`) — 4 endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/jobs` | List jobs (filter by type/status) |
| GET | `/api/jobs/:id` | Job detail |
| POST | `/api/jobs/:id/retry` | Retry failed job |
| POST | `/api/jobs/:id/cancel` | Cancel queued job |

**Job types:** `supplier_import`, `supplier_email_sync`

**Job status flow:** `queued` → `running` → `succeeded` | `failed`

#### C. Tests

- **E2E:** Covered indirectly via supplier import flows that create jobs

#### D. Screenshots

1. Default state: Jobs list with status badges and progress
2. Worked state: Job detail drawer open showing progress and errors
3. Edge state: Empty "Jobs will appear here..."

---

### 2.8 Invoices

**Page identity:**
- Nav name: Invoices
- Route: `/invoices`
- Main file: `src/pages/Invoices/InvoicesView.tsx`

#### A. Frontend Key Logic

**Create in-person invoice** (lines ~100-130):

```typescript
const handleCreateInPerson = async (formData) => {
  await apiPost('/invoices', {
    type: 'in_person',
    amountPaidEur: formData.amount,
    description: formData.description,
    vatPct: formData.vatPct,
  })
  toast.success('Invoice created and PDF stored')
}
```

**PDF generation:**

```typescript
await apiPost(`/invoices/${id}/generate-pdf`, {})
```

**Features:** Create in-person invoice modal, upload PDF invoice, invoice detail view, PDF generation.

#### B. Backend Key Logic

**Invoices API** (`packages/server/src/routes/invoices.ts`) — 5 endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/invoices` | Create invoice |
| POST | `/api/invoices/upload` | Upload PDF |
| GET | `/api/invoices` | List invoices |
| GET | `/api/invoices/:id` | Invoice detail |
| POST | `/api/invoices/:id/generate-pdf` | Generate PDF via pdfmake |

**VAT helpers** used in invoice creation (`packages/server/src/lib/vat.ts`):

```typescript
export function vatFromNet(netEur: number, ratePct: number) {
  const vatEur = Math.round((netEur * (ratePct / 100)) * 100) / 100
  return { vatEur, grossEur: netEur + vatEur }
}
export function vatFromGross(grossEur: number, ratePct: number) {
  const netEur = Math.round((grossEur / (1 + ratePct / 100)) * 100) / 100
  return { netEur, vatEur: Math.round((grossEur - netEur) * 100) / 100 }
}
```

#### C. Tests

- **Unit:** `packages/server/src/lib/vat.test.ts` — 6 tests: vatFromNet, vatFromGross, rounding, zero rate
- **E2E:** `tests/e2e/evaluator.spec.ts` — invoices page loads, create in-person button opens form

#### D. Screenshots

1. Default state: Invoice list with status
2. Worked state: Create in-person invoice form
3. Edge state: Empty "No invoices yet" with create buttons

---

### 2.9 Market Research

**Page identity:**
- Nav name: Market Research
- Route: `/market-research`
- Main file: `src/pages/MarketResearch/MarketResearchView.tsx`

#### A. Frontend Key Logic

**Analysis flow:**

```typescript
const res = await apiPost('/market-research/analyse', {
  brand, model, category, condition, provider
})
```

**Features:** Brand/model dropdowns, trending items feed, competitor activity feed, previous search persistence in localStorage, key trending bags quick-select.

#### B. Backend Key Logic

**Market Research API** (`packages/server/src/routes/market-research.ts`) — 3 endpoints:
- POST `/api/market-research/analyse` — deep AI analysis
- GET `/api/market-research/trending` — trending luxury items
- GET `/api/market-research/competitor-feed` — competitor listings

**Uses:** `MarketResearchService` backed by OpenAI or Gemini (or mock).

#### C. Tests

- **E2E:** `tests/e2e/market-research.spec.ts` — research flow with mocked API response

#### D. Screenshots

1. Default state: Brand/model selectors with trending quick-picks
2. Worked state: Analysis results with market value, demand, recommendations

---

### 2.10 Retail Price

**Page identity:**
- Nav name: Retail Price
- Route: `/retail-price`
- Main file: `src/pages/RetailPrice/RetailPriceView.tsx`

#### A. Frontend Key Logic

```typescript
const res = await apiPost('/ai/retail-lookup', { description })
```

**Features:** Simple text input for product description, AI-powered retail price estimation.

#### B. Backend Key Logic

- POST `/api/ai/retail-lookup` — calls `AiService.getRetailPriceFromDescription()` (OpenAI or mock)

---

### 2.11 Serial Check

**Page identity:**
- Nav name: Serial Check
- Route: `/serial-check`
- Main file: `src/pages/SerialCheck/SerialCheckView.tsx`

#### A. Frontend Key Logic

Entirely client-side. Uses `decodeSerialToYear()` from `src/lib/serialDateDecoder.ts`:

```typescript
const result = decodeSerialToYear(serial, brand)
// result: { success, year?, period?, message, note? }
```

**No backend calls.** Supported brands: Louis Vuitton, Chanel; others show guidance message.

#### B. Tests

- **Unit:** `src/lib/serialDateDecoder.test.ts` — 7 tests: LV modern (2007+), LV 1990-2006, LV 1980s, invalid LV, Chanel 8-digit, Chanel 7-digit, other brands

---

## 3. Per-Widget Deep Dives

---

### 3.1 EUR to JPY Converter

**Widget name:** EUR to JPY Converter
**Where it appears:** Dashboard, Quick tools grid (row 2, left)
**Requirement:** Real-time FX rate display for Japanese auction bidding

#### Code Boundaries

| Layer | File | Lines |
|-------|------|-------|
| Frontend widget | `src/components/widgets/EurToYenWidget.tsx` | 1-157 |
| FX rate fetcher | `src/lib/fxRate.ts` | 1-27 |

#### How It Works

1. On mount, `fetchEurToJpy()` calls the Frankfurter API (no API key, CORS-friendly): `https://api.frankfurter.dev/v1/latest?symbols=JPY`
2. Response parsed for `{ rates: { JPY: number }, date: string }`
3. User enters amount; direction toggles between EUR→JPY and JPY→EUR
4. Conversion: `result = amount * rate` (EUR→JPY) or `amount * (1/rate)` (JPY→EUR)
5. Optional: `VITE_FX_API_URL` overrides the endpoint (expects same shape)

**Key snippet** (`src/lib/fxRate.ts`):

```typescript
export async function fetchEurToJpy(): Promise<FxResult> {
  const url = import.meta.env.VITE_FX_API_URL || FRANKFURTER_URL
  const res = await fetch(url)
  if (!res.ok) throw new Error(`FX API error: ${res.status}`)
  const data = await res.json()
  const rate = data.rates?.JPY ?? data.data?.rate
  if (typeof rate !== 'number' || rate <= 0) throw new Error('Invalid FX rate')
  return { rate, date: data.date ?? new Date().toISOString().slice(0, 10), source: '...' }
}
```

**Assumptions:** Rate updates only on manual refresh (no polling). Null handling: shows loading skeleton if rate not yet loaded; error state with retry button.

**Example:** Input 1000 EUR at rate 161.5 → Output: ¥161,500

#### Test Proof

No dedicated unit test for the widget. The FX rate function is a thin fetch wrapper; validation is inline.

---

### 3.2 Landed Cost Widget

**Widget name:** Landed Cost (Quick)
**Where it appears:** Dashboard, Quick tools grid (row 1, left)
**Requirement:** Quick estimate of total landed cost from a bid price

#### Code Boundaries

| Layer | File |
|-------|------|
| Frontend widget | `src/components/widgets/LandedCostWidget.tsx` |

#### How It Works

1. User enters a bid price in EUR
2. Fixed percentages applied sequentially: Auction fee (7%), Customs (3%), VAT (23%)
3. Formula: `afterAuction = bid * 1.07`, `afterCustoms = afterAuction * 1.03`, `landed = afterCustoms * 1.23`

**Key snippet** (`src/components/widgets/LandedCostWidget.tsx`, lines 20-31):

```typescript
const { auctionFee, customs, vat, landed } = useMemo(() => {
  if (bid <= 0) return { auctionFee: 0, customs: 0, vat: 0, landed: 0 }
  const afterAuction = bid * (1 + 7 / 100)
  const afterCustoms = afterAuction * (1 + 3 / 100)
  const afterVat = afterCustoms * (1 + 23 / 100)
  return { auctionFee: afterAuction - bid, customs: afterCustoms - afterAuction,
           vat: afterVat - afterCustoms, landed: afterVat }
}, [bid])
```

**Assumptions:** Fixed rates (7/3/23) are hard-coded defaults. For configurable rates, users use the full Calculator Widget on the Buy Box page.

**Example:** Bid €1000 → Auction fee €70 → Customs €32.10 → VAT €253.48 → Landed: €1,355.58

---

### 3.3 Calculator Widget (Advanced Landed Cost)

**Widget name:** Calculator Widget
**Where it appears:** Buy Box page, "Landed Cost" tab
**Requirement:** Full landed cost calculator with multi-currency support and reverse calculation

#### Code Boundaries

| Layer | File |
|-------|------|
| Frontend widget | `src/components/widgets/CalculatorWidget.tsx` |
| Core logic | `src/lib/landedCost.ts` |
| Unit tests | `src/lib/landedCost.test.ts` |

#### How It Works

**Forward calculation** (`calculateLandedCost`):
1. Convert base price to EUR using currency rate
2. Calculate platform + payment fees on base price
3. CIF = item cost (EUR) + shipping (EUR) + insurance (EUR)
4. Customs duty = CIF * customs%
5. Import VAT = (CIF + duty) * VAT%
6. Total landed = CIF + duty + VAT + fees

**Reverse calculation** (`calculateMaxBuyPrice`):
1. Target landed cost = sell price * (1 - margin%)
2. Algebraically solve for base price given all cost multipliers

**Key snippet** (`src/lib/landedCost.ts`, lines 39-79):

```typescript
export function calculateLandedCost(input: LandedCostInput): LandedCostOutput {
  const rateToEur = currency === 'EUR' ? 1 : rates ? (1 / rates[currency]) || 0 : 0
  const cifEur = itemCostEur + shippingEur + insuranceEur
  const dutyEur = cifEur * (customsPct / 100)
  const vatEur = (cifEur + dutyEur) * (importVatPct / 100)
  const totalLandedEur = cifEur + dutyEur + vatEur + feesEur
  // ... breakdown, margin calculation
}
```

**Example:** JPY 10,000 item + 2,000 shipping + 10% customs + 23% VAT + 5% platform + 3% payment = total landed EUR (deterministic).

#### Test Proof

**Unit test** (`src/lib/landedCost.test.ts`) — 4 tests:
- EUR simplest case (no customs, with VAT)
- JPY with duties and fees
- Reverse calculation: verify round-trip (forward → target margin matches)
- Edge case: costs exceed target price → returns 0

---

### 3.4 Serial Check Widget

**Widget name:** Serial Check
**Where it appears:** Dashboard, Quick tools grid (row 1, right); Full page at `/serial-check`
**Requirement:** Decode luxury bag serial/date codes to production year

#### Code Boundaries

| Layer | File |
|-------|------|
| Dashboard widget | `src/components/widgets/SerialCheckWidget.tsx` |
| Full page | `src/pages/SerialCheck/SerialCheckView.tsx` |
| Decoder logic | `src/lib/serialDateDecoder.ts` |
| Unit tests | `src/lib/serialDateDecoder.test.ts` |

#### How It Works

1. User enters serial code and selects brand
2. `decodeSerialToYear(serial, brand)` routes to brand-specific decoder
3. **Louis Vuitton:** Three formats:
   - 2007+: 2 letters + 4 digits (e.g. `SR3179` → Week 37, 2019)
   - 1990-2006: 2 letters + 4 digits, month/year encoding
   - 1980s: 3-4 digits, year + month
4. **Chanel:** 8-digit (2005+, first two = year) or 7-digit (1986-2005)
5. Other brands: guidance message (no decoder yet)

**Key snippet** (`src/lib/serialDateDecoder.ts`, lines 43-58):

```typescript
function decodeLVModern(code: string): DecodeResult | null {
  const match = code.match(/^[A-Z]{2}(\d)(\d)(\d)(\d)$/)
  if (!match) return null
  const week = parseInt(d0 + d2, 10)      // 1st + 3rd digits = week
  const yearShort = parseInt(d1 + d3, 10)  // 2nd + 4th digits = year
  const year = yearShort >= 90 ? 1900 + yearShort : 2000 + yearShort
  return { success: true, year, period: `Week ${week}`, message: `Production: Week ${week}, ${year}.` }
}
```

**Example:** `SR3179` → Year 2019, Week 37

#### Test Proof

**Unit test** (`src/lib/serialDateDecoder.test.ts`) — 7 tests:
- LV modern format (SR3179 → 2019)
- LV 1990-2006 format (SP0065 → 2005, June)
- LV 1980s format (844 → 1984, April)
- Invalid LV code → success: false
- Chanel 8-digit (25123456 → 2025)
- Chanel 7-digit (6123456 → 1996)
- Other brands → guidance message

---

### 3.5 AI Prompt Bar

**Widget name:** AI Prompt Bar
**Where it appears:** Dashboard, top of content area
**Requirement:** Natural language command bar for quick business queries

#### Code Boundaries

| Layer | File |
|-------|------|
| Frontend widget | `src/components/widgets/AiPromptBar.tsx` |
| Backend | `packages/server/src/routes/ai.ts` (POST `/api/ai/prompt`) |

#### How It Works

1. User types a question (e.g. "What is my top-selling brand?")
2. `apiPost('/ai/prompt', { prompt })` sends to backend
3. Backend routes to `AiService.prompt()` which calls OpenAI (or mock)
4. Response displayed as a toast notification (duration: 6000ms)

**Key snippet** (`src/components/widgets/AiPromptBar.tsx`, lines 11-29):

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  const trimmed = prompt.trim()
  if (!trimmed || loading) return
  setLoading(true)
  try {
    const response = await apiPost<{ data: { reply: string } }>('/ai/prompt', { prompt: trimmed })
    toast.success(response.data?.reply ?? 'No response.', { duration: 6000 })
    setPrompt('')
  } catch (err) { toast.error('Could not get AI response.') }
  finally { setLoading(false) }
}
```

---

### 3.6 Auction Links Widget

**Widget name:** Auction Sites
**Where it appears:** Dashboard, Quick tools grid (row 2, right)
**Requirement:** Quick navigation to Japanese auction platforms

#### Code Boundaries

| Layer | File |
|-------|------|
| Frontend widget | `src/components/widgets/AuctionLinksWidget.tsx` |

#### How It Works

Static links to two auction platforms:
- **AUCNET** (Brand Auction): `https://member.brand-auc.com/login`
- **Star Buyers** (Global Auction): `https://www.starbuyers-global-auction.com/home`

Each opens in a new tab (`target="_blank" rel="noopener noreferrer"`).

No backend calls. No dynamic data. Pure navigation convenience.

---

## 4. Test Proof

### 4.1 Unit Tests

| Test File | Tests | What It Covers |
|-----------|-------|----------------|
| `packages/server/src/lib/fx.test.ts` | 3 | USD→EUR conversion, rounding, zero handling |
| `packages/server/src/lib/vat.test.ts` | 6 | VAT from net, VAT from gross, rounding, zero rate |
| `packages/server/src/lib/sourcingStatus.test.ts` | 11 | All valid transitions, all invalid transitions, no-op, getValidNextStatuses |
| `packages/server/src/lib/csvProductParser.test.ts` | 10 | CSV mapping, aliases, defaults, AI column map, Luxselle canonical format |
| `packages/server/src/services/pricing/PricingService.test.ts` | 10 | Margin calc, edge cases (0%, 100%), large values, historical avg, provider selection, IE-first market policy, auction landed cost determinism |
| `packages/server/src/services/import/SupplierImportService.test.ts` | 3 | CSV parsing, required headers, multiple rows |
| `packages/server/src/services/import/SupplierImportService.template.test.ts` | 3 | CSV/XLSX preview, template import with FX conversion |
| `packages/server/src/services/import/SupplierEmailSyncService.test.ts` | 2 | Email import for matched supplier, dedupe skip |
| `src/lib/api.test.ts` | 3 | normalizeApiBase: undefined/empty → /api, absolute URL, relative path |
| `src/lib/serialDateDecoder.test.ts` | 7 | LV modern/90s/80s, Chanel 8/7 digit, invalid, other brands |
| `src/lib/landedCost.test.ts` | 4 | EUR simple, JPY with fees, reverse calc round-trip, costs exceed target |

**Total: 62 unit tests across 11 files.**

**Key test example — FX conversion** (`packages/server/src/lib/fx.test.ts`):

```typescript
import { usdToEur } from './fx'
describe('usdToEur', () => {
  it('converts USD to EUR using rate', () => {
    expect(usdToEur(100, 0.92)).toBe(92)
    expect(usdToEur(100, 1)).toBe(100)
  })
  it('rounds to two decimal places', () => {
    expect(usdToEur(10, 0.9234)).toBe(9.23)
  })
  it('handles zero', () => { expect(usdToEur(0, 0.92)).toBe(0) })
})
```

**Key test example — Sourcing status** (`packages/server/src/lib/sourcingStatus.test.ts`):

```typescript
it('allows open -> sourcing', () => { expect(isValidSourcingTransition('open', 'sourcing')).toBe(true) })
it('rejects open -> fulfilled', () => { expect(isValidSourcingTransition('open', 'fulfilled')).toBe(false) })
it('getValidNextStatuses returns allowed next states', () => {
  expect(getValidNextStatuses('sourced')).toEqual(['fulfilled', 'lost'])
})
```

**Key test example — Auction landed cost** (`PricingService.test.ts`):

```typescript
it('calculates auction landed cost breakdown deterministically', async () => {
  const result = service.calculateAuctionLandedCost({
    hammerEur: 1000, buyerPremiumPct: 10, platformFeePct: 5, fixedFeeEur: 20,
    paymentFeePct: 2, shippingEur: 40, insuranceEur: 10, customsDutyPct: 4, importVatPct: 23,
  })
  expect(result.buyerPremiumEur).toBe(100)
  expect(result.landedCostEur).toBe(1590.56)
})
```

### 4.2 E2E Tests

| Test File | Tests | Pages Covered |
|-----------|-------|---------------|
| `tests/e2e/evaluator.spec.ts` | 9 | Buy Box, Buying List, Inventory, Invoices, nav routing, legacy redirects |
| `tests/e2e/dashboard-shell.spec.ts` | 5 | Dashboard, mobile nav, desktop nav, side rail, breadcrumbs, skeleton, low-stock |
| `tests/e2e/inventory.spec.ts` | 3 | Inventory: clear filters, view toggle, product prices |
| `tests/e2e/sourcing.spec.ts` | 1 | Sourcing: new request creation |
| `tests/e2e/market-research.spec.ts` | 1 | Market Research: mocked analysis flow |

**Total: 19 E2E tests across 5 files.**

**Key E2E example — Full evaluator flow** (`tests/e2e/evaluator.spec.ts`):

```typescript
test('evaluator flow adds item and receives into inventory', async ({ page }) => {
  // Mock price-check API
  await page.route('**/api/pricing/price-check', (route) => route.fulfill({ status: 200, body: JSON.stringify({ data: { averageSellingPriceEur: 5000, comps: [...], maxBuyEur: 3200 } }) }))
  // 1. Search on Buy Box page
  await page.goto('/buy-box')
  await page.getByPlaceholder(/e.g. Chanel Classic Flap/).fill('Chanel Classic Flap')
  await page.getByRole('button', { name: 'Research market' }).click()
  await expect(page.getByText('Avg. selling price')).toBeVisible()
  // 2. Add to buying list
  await page.getByRole('button', { name: 'Add to buying list' }).click()
  // 3. Verify on buying list
  await page.goto('/buying-list')
  await expect(page.locator('tr', { hasText: 'Chanel Classic Flap' })).toBeVisible()
  // 4. Receive into inventory
  await row.getByRole('button', { name: 'Receive' }).click()
  // 5. Verify in inventory
  await page.goto('/inventory')
  await expect(page.getByText('Chanel Classic Flap')).toBeVisible()
})
```

---

## 5. AI Usage Notes

Template for per-page/feature AI traceability. Fill in for each feature where AI tools were used:

### Template

```
FEATURE: [Feature/page name]
TOOL: Cursor Agent / Cursor Autocomplete / Cursor Chat / Manual
USED FOR: [Planning UI structure / Refactoring / Generating function / Debugging / Test writing]
REPRESENTATIVE PROMPTS:
  1. "[Prompt 1]"
  2. "[Prompt 2]"
  3. "[Prompt 3]"
ACCEPTED: [What was kept as-generated]
CHANGED MANUALLY: [What was modified after generation]
```

### Example (for reference)

```
FEATURE: Sourcing Status Transition Validation
TOOL: Cursor Agent (agent-backend)
USED FOR: Generating state machine + unit tests for sourcing status transitions
REPRESENTATIVE PROMPTS:
  1. "Add sourcing status transition validation to PUT /api/sourcing/:id"
  2. "Write unit tests for valid and invalid sourcing status transitions"
ACCEPTED: State machine pattern (ALLOWED map), isValidSourcingTransition function
CHANGED MANUALLY: Added same-status no-op (from === to returns true), adjusted error message format
```

```
FEATURE: Landed Cost Calculator (Forward + Reverse)
TOOL: Cursor Agent (agent-evaluator)
USED FOR: Implementing multi-currency landed cost calculation with reverse solve
REPRESENTATIVE PROMPTS:
  1. "Create a landed cost calculator that supports EUR, USD, GBP, JPY currencies"
  2. "Add reverse calculation: given target sell price and margin, find max buy price"
ACCEPTED: Forward calculation formula (CIF + duty + VAT + fees), breakdown array
CHANGED MANUALLY: Fixed reverse calc algebra for fee multiplier, added edge case (costs > target → return 0)
```

```
FEATURE: Serial Date Code Decoder
TOOL: Manual + Cursor Chat
USED FOR: Research on LV/Chanel date code formats, then implementing decoder
REPRESENTATIVE PROMPTS:
  1. "How do Louis Vuitton date codes work for 2007+ items?"
  2. "Implement Chanel serial number year decoder"
ACCEPTED: LV modern format regex, Chanel 8-digit year extraction
CHANGED MANUALLY: Added 1980s LV format, added Chanel 7-digit format, fallback for other brands
```

---

## 6. Screenshot Checklist

For each page, capture these screenshots for the documentation. Place them in a `docs/screenshots/` folder.

| # | Page | Default State | Worked State | Edge State |
|---|------|---------------|--------------|------------|
| 1 | Dashboard | KPIs loaded, widgets visible | After refresh with animated counters | Loading skeleton (delay API) |
| 2 | Inventory | Table with products, filter bar | Product detail drawer open (tabs) | Empty "Add your first product" |
| 3 | Buy Box | Search form with Research button | Results: avg price, max buy, comps | Empty "Enter an item name" |
| 4 | Supplier Hub | Supplier grid + item gallery | Import preview modal | Empty items "No items match" |
| 5 | Sourcing | Request list with status badges | Edit modal with status dropdown | Empty "No sourcing requests" |
| 6 | Buying List | Table with receive buttons | Bulk order view with message | Empty "Use the Evaluator" |
| 7 | Jobs | Jobs list with progress | Job detail drawer | Empty "Jobs will appear" |
| 8 | Invoices | Invoice list | Create in-person form | Empty "No invoices yet" |
| 9 | Market Research | Brand/model selectors | Analysis results | Loading "Researching..." |
| 10 | Retail Price | Description input form | AI price result | Loading "Looking up..." |
| 11 | Serial Check | Brand + serial input | Decoded year result (green) | Invalid code warning (amber) |

**Naming convention:** `{page}-{state}.png` (e.g. `dashboard-default.png`, `inventory-empty.png`)

---

## Appendix: Key File Reference Index

Quick lookup for all files referenced in this document:

| Category | File | Purpose |
|----------|------|---------|
| **App Shell** | `src/LuxselleApp.tsx` | Routing, providers, layout |
| **API Client** | `src/lib/api.ts` | apiGet/Post/Put/Delete, ApiError |
| **Firebase Client** | `src/lib/firebase.ts` | Client-side Firebase config |
| **FX Rate** | `src/lib/fxRate.ts` | EUR→JPY Frankfurter API fetcher |
| **Landed Cost** | `src/lib/landedCost.ts` | Forward + reverse calculation |
| **Serial Decoder** | `src/lib/serialDateDecoder.ts` | LV/Chanel date code decoder |
| **Formatters** | `src/lib/formatters.ts` | Currency + relative date formatting |
| **Query Client** | `src/lib/queryClient.ts` | TanStack Query config + keys |
| **Dashboard Types** | `src/types/dashboard.ts` | KPIs, ProfitSummary, ProductWithId |
| **Error Codes** | `packages/server/src/lib/errors.ts` | API_ERROR_CODES, formatApiError |
| **FX Server** | `packages/server/src/lib/fx.ts` | usdToEur conversion |
| **VAT** | `packages/server/src/lib/vat.ts` | vatFromNet, vatFromGross |
| **Sourcing Status** | `packages/server/src/lib/sourcingStatus.ts` | State machine |
| **CSV Parser** | `packages/server/src/lib/csvProductParser.ts` | CSV→product mapping |
| **Server Entry** | `packages/server/src/server.ts` | Express app + error handler |
| **Firebase Admin** | `packages/server/src/config/firebase.ts` | Admin SDK init |
| **Base Repo** | `packages/server/src/repos/BaseRepo.ts` | Generic Firestore CRUD |
| **Pricing Service** | `packages/server/src/services/pricing/PricingService.ts` | AI pricing + margin calc |
| **Import Service** | `packages/server/src/services/import/SupplierImportService.ts` | CSV/XLSX import |
| **Email Sync** | `packages/server/src/services/import/SupplierEmailSyncService.ts` | Gmail integration |
| **Schemas** | `packages/shared/src/schemas/index.ts` | All Zod schemas barrel |
