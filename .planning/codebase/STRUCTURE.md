# Codebase Structure

**Analysis Date:** 2026-03-02

## Directory Layout

```
luxselle-dashboard/              # NPM workspace root (also React frontend)
├── src/                         # React frontend source
│   ├── main.tsx                 # React entry point
│   ├── LuxselleApp.tsx          # App shell, providers, layout routing
│   ├── pages/                   # Route-level page views (lazy-loaded)
│   ├── components/              # Shared UI components
│   ├── hooks/                   # Custom React hooks
│   ├── lib/                     # Frontend utilities, API client, contexts
│   ├── styles/                  # Global CSS (Tailwind base)
│   └── types/                   # Frontend TypeScript types
├── packages/
│   ├── server/                  # Express API server (@luxselle/server)
│   │   └── src/
│   │       ├── server.ts        # Express app entry point
│   │       ├── config/          # env + Firebase Admin init
│   │       ├── middleware/      # requestId, auth, idempotency
│   │       ├── routes/          # Express route modules
│   │       ├── services/        # Business logic
│   │       ├── repos/           # Firestore data access (BaseRepo pattern)
│   │       ├── lib/             # Backend utilities (errors, formatters, parsers)
│   │       └── test-utils/      # Shared test helpers
│   └── shared/                  # Shared Zod schemas (@luxselle/shared)
│       └── src/
│           ├── index.ts         # Package entry: re-exports all schemas
│           └── schemas/         # One .ts file per entity schema
├── config/                      # Build/test tool configs (vite, vitest, playwright)
├── firebase/                    # Firebase config files (rules, indexes, emulator config)
├── tests/                       # E2E Playwright tests
├── scripts/                     # Utility scripts (seed, import, launch-agent-swarm)
├── public/                      # Static assets (fonts)
├── storage/                     # Local file storage (invoices)
├── docs/                        # Project documentation
├── .planning/                   # GSD planning artifacts (phases, codebase docs)
├── index.html                   # Vite HTML entry
├── package.json                 # Workspace root (workspaces: packages/server, packages/shared)
├── tsconfig.json                # Root TS config (frontend only; @shared alias)
├── tailwind.config.js           # Tailwind configuration
├── vercel.json                  # Vercel frontend deployment config
└── railway.toml                 # Railway backend deployment config
```

## Directory Purposes

**`src/pages/`:**
- Purpose: One directory per route, containing the main view component and route-specific subcomponents
- Contains: Route view (e.g. `InventoryView.tsx`), drawer/modal components, sub-views
- Key directories:
  - `src/pages/Dashboard/` — KPI overview, activity feed
  - `src/pages/Inventory/` — product list, add/edit/import drawers
  - `src/pages/UnifiedIntelligence/` — combined evaluator (buy-box, serial check, price check)
  - `src/pages/Sourcing/` — sourcing request management
  - `src/pages/Invoices/` — invoice list and detail
  - `src/pages/MarketResearch/` — AI-powered market research queries
  - `src/pages/SavedResearch/` — saved research records
  - `src/pages/RetailPrice/` — retail price lookup
  - `src/pages/Jobs/` — background job monitoring

**`src/components/`:**
- Purpose: Shared UI components reused across pages
- Subdirectories:
  - `common/` — generic reusable components (buttons, badges, etc.)
  - `design-system/` — design token components
  - `feedback/` — loading states, skeletons, toasts
  - `layout/` — AnimatedRoutes, PageTransition, DeepStateBreadcrumb, routeMeta
  - `navigation/` — DockBar, MobileNavDrawer, SidecarNav, WideScreenSideRail, navGroups
  - `sidecar/` — SidecarView, SidecarWidgets, BatchProcessor, QuickCheck
  - `widgets/` — dashboard widget components

**`src/lib/`:**
- Purpose: Frontend utilities, API client, React contexts, client-side business logic
- Key files:
  - `src/lib/api.ts` — `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiPostFormData`, `ApiError`
  - `src/lib/queryClient.ts` — TanStack Query client + `queryKeys` map
  - `src/lib/LayoutModeContext.tsx` — overview vs sidecar mode context
  - `src/lib/ServerStatusContext.tsx` — backend connectivity + AI provider status
  - `src/lib/ResearchSessionContext.tsx` — research session state across pages
  - `src/lib/formatters.ts` — currency, date, number formatters
  - `src/lib/landedCost.ts` — landed cost calculation (client-side)
  - `src/lib/serialDateDecoder.ts` — serial number date decoding utilities
  - `src/lib/sourcingDecision.ts` — sourcing decision logic

**`src/types/`:**
- Purpose: Frontend TypeScript types that extend or alias shared schema types
- Key files: `src/types/dashboard.ts` — types like `ProductWithId` used across pages

**`src/hooks/`:**
- Purpose: Custom React hooks
- Key files: `src/hooks/useFxRate.ts` — exchange rate hook

**`packages/server/src/routes/`:**
- Purpose: Express Router modules; one file per API domain
- Naming: `{domain}.ts` for route, `{domain}.test.ts` for route tests
- Key routes:
  - `packages/server/src/routes/products.ts` → `/api/products`
  - `packages/server/src/routes/pricing.ts` → `/api/pricing`
  - `packages/server/src/routes/dashboard.ts` → `/api/dashboard`
  - `packages/server/src/routes/sourcing.ts` → `/api/sourcing`
  - `packages/server/src/routes/invoices.ts` → `/api/invoices`
  - `packages/server/src/routes/jobs.ts` → `/api/jobs`
  - `packages/server/src/routes/market-research.ts` → `/api/market-research`
  - `packages/server/src/routes/ai.ts` → `/api/ai`
  - `packages/server/src/routes/search.ts` → `/api/search`
  - `packages/server/src/routes/suppliers.ts` → `/api/suppliers`
  - `packages/server/src/routes/settings.ts` → `/api/settings`
  - `packages/server/src/routes/fx.ts` → `/api/fx`
  - `packages/server/src/routes/vat.ts` → `/api/vat`
  - `packages/server/src/routes/savedResearch.ts` → `/api/saved-research`

**`packages/server/src/repos/`:**
- Purpose: Firestore repositories; all extend `BaseRepo<T>`
- Key files:
  - `packages/server/src/repos/BaseRepo.ts` — generic CRUD, Zod parse, multi-tenancy
  - `packages/server/src/repos/ProductRepo.ts` — products collection
  - `packages/server/src/repos/EvaluationRepo.ts` — pricing evaluations
  - `packages/server/src/repos/InvoiceRepo.ts` — invoices
  - `packages/server/src/repos/SupplierRepo.ts` / `SupplierItemRepo.ts` — suppliers
  - `packages/server/src/repos/SystemJobRepo.ts` — background jobs
  - `packages/server/src/repos/SourcingRequestRepo.ts` — sourcing requests
  - `packages/server/src/repos/SettingsRepo.ts` — org settings
  - `packages/server/src/repos/TransactionRepo.ts` — purchase/sale transactions
  - `packages/server/src/repos/SavedResearchRepo.ts` — saved market research
  - `packages/server/src/repos/ActivityEventRepo.ts` — activity timeline
  - `packages/server/src/repos/ImageEmbeddingRepo.ts` — visual search embeddings
  - `packages/server/src/repos/index.ts` — re-exports all repos

**`packages/server/src/services/`:**
- Purpose: Business logic and AI orchestration
- Key services:
  - `packages/server/src/services/ai/AiRouter.ts` — AI provider routing singleton
  - `packages/server/src/services/ai/AiService.ts` — higher-level AI task helpers
  - `packages/server/src/services/pricing/PricingService.ts` — pricing analysis orchestrator
  - `packages/server/src/services/pricing/providers/OpenAIProvider.ts` — pricing provider implementation
  - `packages/server/src/services/pricing/providers/IPricingProvider.ts` — pricing provider interface
  - `packages/server/src/services/search/SearchService.ts` — product search
  - `packages/server/src/services/search/ComparableImageEnrichmentService.ts` — image URL enrichment for comps
  - `packages/server/src/services/market-research/MarketResearchService.ts` — AI market research
  - `packages/server/src/services/price-check/PriceCheckService.ts` — RAG price check
  - `packages/server/src/services/import/` — supplier CSV/PDF import services
  - `packages/server/src/services/fx/` — FX rate services
  - `packages/server/src/services/visualSearch/` — visual similarity search
  - `packages/server/src/services/JobRunner.ts` — in-process job execution
  - `packages/server/src/services/SavedResearchService.ts` — saved research CRUD
  - `packages/server/src/services/InvoicePdfService.ts` — invoice PDF generation

**`packages/server/src/lib/`:**
- Purpose: Pure backend utility functions (no Express dependency)
- Key files:
  - `packages/server/src/lib/errors.ts` — `ApiError`, `formatApiError`, `API_ERROR_CODES`
  - `packages/server/src/lib/validation.ts` — shared validation helpers
  - `packages/server/src/lib/vat.ts` — VAT calculation utilities
  - `packages/server/src/lib/fx.ts` — exchange rate utilities
  - `packages/server/src/lib/csvProductParser.ts` — CSV parsing for product imports
  - `packages/server/src/lib/parseLuxsellePdf.ts` — PDF parsing utilities
  - `packages/server/src/lib/sourcingStatus.ts` — sourcing status helpers

**`packages/server/src/config/`:**
- Purpose: Environment and infrastructure initialization
- Key files:
  - `packages/server/src/config/env.ts` — Zod-validated typed `env` object
  - `packages/server/src/config/firebase.ts` — Firebase Admin app, `db` (Firestore), `storage`

**`packages/shared/src/schemas/`:**
- Purpose: All Zod schemas and inferred types; shared by both packages
- Files: `base.ts`, `product.ts`, `supplier.ts`, `supplierItem.ts`, `buyingListItem.ts`, `transaction.ts`, `evaluation.ts`, `pricing.ts`, `serialCheck.ts`, `activityEvent.ts`, `sourcingRequest.ts`, `settings.ts`, `invoice.ts`, `systemJob.ts`, `visualSearch.ts`, `savedResearch.ts`
- Entry: `packages/shared/src/schemas/index.ts` re-exports everything; `packages/shared/src/index.ts` re-exports schemas

**`config/`:**
- Purpose: Build and test tool configuration
- Key files:
  - `config/vite.config.ts` — Vite frontend build config
  - `config/vitest.config.ts` — Vitest unit test config
  - `config/playwright.config.cjs` — Playwright E2E config

**`firebase/`:**
- Purpose: Firebase project configuration
- Key files:
  - `firebase/firebase.json` — emulator ports and project config
  - `firebase/firestore.rules` — Firestore security rules
  - `firebase/firestore.indexes.json` — composite indexes
  - `firebase/storage.rules` — Firebase Storage security rules

**`tests/`:**
- Purpose: Playwright E2E tests
- Location: `tests/e2e/`

**`scripts/`:**
- Purpose: Operational and dev utility scripts
- Examples: seed data, Excel/PDF import runners, agent swarm launcher, GSD sync

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Frontend React entry
- `src/LuxselleApp.tsx`: App shell and provider tree
- `packages/server/src/server.ts`: Express app factory and entry point

**Route Registration:**
- `src/components/layout/AnimatedRoutes.tsx`: Frontend route-to-component map
- `packages/server/src/server.ts`: Backend router mount points (`app.use('/api/...')`)

**Configuration:**
- `packages/server/src/config/env.ts`: All backend env vars (typed and validated)
- `config/vite.config.ts`: Frontend build settings, path aliases
- `tsconfig.json`: Root TypeScript config, `@shared/*` path alias

**Core Logic:**
- `packages/server/src/repos/BaseRepo.ts`: Firestore CRUD base class
- `packages/server/src/services/ai/AiRouter.ts`: AI routing + fallback logic
- `packages/server/src/services/pricing/PricingService.ts`: Pricing orchestrator
- `src/lib/api.ts`: Frontend HTTP client

**Type Contracts:**
- `packages/shared/src/schemas/index.ts`: All shared Zod schemas
- `src/types/dashboard.ts`: Frontend-specific type aliases

**Testing:**
- `config/vitest.config.ts`: Vitest configuration
- `packages/server/src/test-utils/`: Backend test helpers
- `tests/e2e/`: Playwright E2E specs

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g. `InventoryView.tsx`, `ProductDetailDrawer.tsx`)
- Backend route files: `{domain}.ts` / `{domain}.test.ts` (e.g. `pricing.ts`, `pricing.test.ts`)
- Backend service files: `PascalCaseService.ts` (e.g. `PricingService.ts`, `SearchService.ts`)
- Backend repo files: `PascalCaseRepo.ts` (e.g. `ProductRepo.ts`, `EvaluationRepo.ts`)
- Shared schemas: `{entity}.ts` lowercase (e.g. `product.ts`, `invoice.ts`)
- Context files: `PascalCaseContext.tsx` (e.g. `LayoutModeContext.tsx`)
- Tests: colocated `*.test.ts` next to source files

**Directories:**
- Frontend pages: `PascalCase/` matching route name (e.g. `Inventory/`, `MarketResearch/`)
- Backend service subdirs: `kebab-case/` (e.g. `market-research/`, `price-check/`, `visual-search/`)

**Exports:**
- Zod schemas: `FooSchema` (const), `type Foo = z.infer<typeof FooSchema>`
- Express routers: `router as fooRouter` (named export)
- React components: default export

## Where to Add New Code

**New Frontend Page:**
- Create directory: `src/pages/NewPage/`
- View component: `src/pages/NewPage/NewPageView.tsx`
- Add lazy route: `src/components/layout/AnimatedRoutes.tsx`
- Add nav entry: `src/components/navigation/navGroups.ts`
- Route meta: `src/components/layout/routeMeta.ts`

**New API Endpoint:**
- Schema (if new entity): `packages/shared/src/schemas/{entity}.ts`, add export to `packages/shared/src/schemas/index.ts`
- Repo (if new Firestore collection): `packages/server/src/repos/NewEntityRepo.ts` extending `BaseRepo<T>`
- Service (if business logic needed): `packages/server/src/services/NewEntityService.ts`
- Route: `packages/server/src/routes/{domain}.ts`
- Mount: `packages/server/src/server.ts` (`app.use('/api/{domain}', newRouter)`)
- Route test: `packages/server/src/routes/{domain}.test.ts`

**New Shared Type:**
- Add to appropriate file in `packages/shared/src/schemas/`
- Export from `packages/shared/src/schemas/index.ts`

**New Backend Utility:**
- Pure functions with no Express dependency: `packages/server/src/lib/{utility}.ts`
- Infrastructure-dependent: `packages/server/src/services/{ServiceName}.ts`

**New Frontend Utility:**
- Stateless helpers: `src/lib/{utility}.ts`
- Stateful React hook: `src/hooks/use{Name}.ts`
- React Context: `src/lib/{Name}Context.tsx`

**Shared Component:**
- UI primitive: `src/components/common/`
- Feedback/loading: `src/components/feedback/`
- Navigation chrome: `src/components/navigation/`

## Special Directories

**`.planning/`:**
- Purpose: GSD planning artifacts — phase plans, codebase analysis docs, debug notes
- Generated: Partially (by GSD commands)
- Committed: Yes

**`dist/`:**
- Purpose: Vite frontend production build output
- Generated: Yes (by `npm run build`)
- Committed: No (gitignored)

**`packages/server/dist/`:**
- Purpose: TypeScript-compiled server output
- Generated: Yes
- Committed: No

**`storage/invoices/`:**
- Purpose: Local invoice PDF storage for development
- Generated: No (manually populated)
- Committed: No

**`firebase/`:**
- Purpose: Firebase project rules and emulator config — checked in
- Generated: No
- Committed: Yes

**`node_modules/`:**
- Purpose: NPM dependencies (root + per-workspace)
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-03-02*
