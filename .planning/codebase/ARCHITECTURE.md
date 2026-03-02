# Architecture

**Analysis Date:** 2026-03-02

## Pattern Overview

**Overall:** Three-tier monorepo — React SPA frontend, Express REST API backend, shared Zod schema library. Client-server communication is stateless HTTP; persistence is entirely via Firebase Firestore (Admin SDK on server only). No GraphQL, no WebSockets.

**Key Characteristics:**
- All data access is server-side only via the Repo layer; browser never touches Firestore directly
- Shared Zod schemas in `packages/shared` are the single source of truth for data shapes used by both frontend types and backend validation
- Frontend fetches all server state with manual `useEffect + apiGet + useState`; React Query client exists for incremental migration but is not yet the primary pattern
- Two UI layout modes: `overview` (full dashboard) and `sidecar` (compact panel, activated via `?mode=sidecar` query param)
- AI operations are routed through a singleton `AiRouter` that provides provider fallback, health tracking, and per-task timeouts

## Layers

**Shared Schemas (`packages/shared`):**
- Purpose: Zod schemas and TypeScript types shared between frontend and backend
- Location: `packages/shared/src/schemas/`
- Contains: One schema file per entity (product, supplier, invoice, etc.) plus `base.ts` and `index.ts`
- Depends on: Nothing (pure Zod)
- Used by: Frontend types, backend route validation, backend repo parse

**Backend Config (`packages/server/src/config`):**
- Purpose: Environment validation and Firebase Admin SDK initialization
- Location: `packages/server/src/config/`
- Key files: `packages/server/src/config/env.ts` (Zod-validated env), `packages/server/src/config/firebase.ts` (Admin SDK init, emulator wiring)
- Depends on: Nothing except `dotenv` and `firebase-admin`
- Used by: All backend layers

**Backend Repos (`packages/server/src/repos`):**
- Purpose: Firestore data access; all entities extend `BaseRepo`
- Location: `packages/server/src/repos/`
- Contains: `BaseRepo.ts` (CRUD + multi-tenancy), one concrete repo per entity
- Key pattern: `BaseRepo<T>` accepts a Zod schema; all reads call `schema.parse()` on raw Firestore data; Timestamps are serialized to ISO strings before parsing
- Depends on: `packages/server/src/config/firebase.ts`, `@shared/schemas`
- Used by: Services and route handlers

**Backend Services (`packages/server/src/services`):**
- Purpose: Business logic; orchestrate repos and external AI calls
- Location: `packages/server/src/services/`
- Subdirectories: `ai/` (AiRouter singleton, AiService), `pricing/` (PricingService + providers), `search/` (SearchService, ComparableImageEnrichmentService), `market-research/`, `price-check/`, `fx/`, `import/`, `visualSearch/`
- Depends on: Repos, `packages/server/src/config/env.ts`, AI provider SDKs (OpenAI, Perplexity via fetch)
- Used by: Route handlers

**Backend Routes (`packages/server/src/routes`):**
- Purpose: Express routers; parse/validate request bodies with Zod, call services, return JSON
- Location: `packages/server/src/routes/`
- Pattern: Each route file instantiates its own repo/service instances at module load, then defines route handlers; passes errors to Express `next(error)` for global handling
- Depends on: Services, repos, `@shared/schemas`, `packages/server/src/lib/errors.ts`
- Used by: `packages/server/src/server.ts`

**Backend Middleware (`packages/server/src/middleware`):**
- Purpose: Cross-cutting concerns applied at Express app level
- Location: `packages/server/src/middleware/`
- Contains: `requestId.ts` (UUID injection, structured JSON logging, error budget tracking), `auth.ts` (Firebase ID token verification, role enforcement — disabled globally for MVP), `idempotency.ts` (X-Idempotency-Key header + Firestore-backed replay)
- Depends on: `packages/server/src/config/firebase.ts`, `packages/server/src/lib/errors.ts`
- Used by: `packages/server/src/server.ts`

**Server Entry (`packages/server/src/server.ts`):**
- Purpose: Express app composition; mounts routers, CORS, body parsing, global error handler
- Location: `packages/server/src/server.ts`
- Mounts: 14 route namespaces under `/api/*` plus `/api/health`
- Error handling: ZodError → 400, ApiError → status from error, body parse errors → 400, unknown → 500
- Auth: `requireAuth` middleware is present but commented out globally; individual routes are unprotected for MVP

**Frontend API Client (`src/lib/api.ts`):**
- Purpose: Fetch wrapper with `ApiError` class; base URL from `VITE_API_BASE`
- Location: `src/lib/api.ts`
- Exports: `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiPostFormData`
- Pattern: All functions call internal `request()` which throws `ApiError` on non-2xx; parses `{ error: { code, message } }` body for error messages

**Frontend Pages (`src/pages`):**
- Purpose: Route-level views; each page directory owns its view and subcomponents
- Location: `src/pages/`
- Pattern: Lazy-loaded via `React.lazy()` in `AnimatedRoutes`; fetch data on mount with `useEffect + apiGet + useState`
- Depends on: `src/lib/api.ts`, `@shared` types (via `src/types/dashboard.ts` re-exports), common components

**Frontend Components (`src/components`):**
- Purpose: Shared UI primitives and layout shells
- Location: `src/components/`
- Subdirectories: `common/`, `design-system/`, `feedback/`, `layout/`, `navigation/`, `sidecar/`, `widgets/`

**Frontend Contexts (`src/lib/*Context.tsx`):**
- Purpose: App-wide state as React Contexts
- Key files:
  - `src/lib/LayoutModeContext.tsx` — `overview` vs `sidecar` mode derived from `?mode=sidecar` query param
  - `src/lib/ServerStatusContext.tsx` — backend health state (connected/disconnected, AI provider availability)
  - `src/lib/ResearchSessionContext.tsx` — cross-page research session state

## Data Flow

**Standard CRUD Read:**
1. Page mounts; `useEffect` fires
2. `apiGet<T>(path)` calls `fetch(${API_BASE}${path})`
3. Express route handler receives request
4. Route calls `repo.list()` or `repo.getById()`
5. `BaseRepo` queries Firestore, serializes Timestamps, parses with Zod schema
6. Route returns `{ data: [...] }` JSON
7. Frontend sets state; component re-renders

**AI-Powered Pricing Flow:**
1. User submits pricing form on `src/pages/UnifiedIntelligence/` or `src/pages/RetailPrice/`
2. `apiPost('/pricing/analyse', input)` → Express `POST /api/pricing/analyse`
3. Route validates body with `PricingAnalysisInputSchema`
4. `PricingService.analyse()` is called; delegates to `OpenAIProvider` which calls `AiRouter`
5. `AiRouter.executeTask()` resolves provider order (Perplexity preferred for web search, OpenAI for extraction), applies per-task timeout, retries on retryable errors, falls back to next provider on failure
6. Service applies margin policy; queries `TransactionRepo` for historical pricing
7. Route saves result as `Evaluation` via `EvaluationRepo`
8. Response includes `evaluationId` plus pricing data

**Job Execution Flow:**
1. Client posts `POST /api/jobs/:id/retry`
2. Route calls `runJob(jobId)` from `packages/server/src/services/JobRunner.ts`
3. `JobRunner` updates job status to `running` in `SystemJobRepo`
4. Executes job handler (e.g. `SupplierEmailSyncService.sync()`)
5. Updates job status to `succeeded` or `failed` with progress details

**State Management:**
- No global client state store (no Redux/Zustand)
- Per-page state via `useState` + `useEffect` + `apiGet`
- React Query (`queryClient` in `src/lib/queryClient.ts`) is instantiated but pages do not yet use `useQuery`; it is available for incremental migration
- Layout mode, server status, and research session are managed via React Context providers in `src/LuxselleApp.tsx`

## Key Abstractions

**BaseRepo:**
- Purpose: Generic Firestore CRUD with Zod validation and multi-tenancy support
- Examples: `packages/server/src/repos/BaseRepo.ts`
- Pattern: All concrete repos extend `BaseRepo<T>`, passing collection name and Zod schema. Two collection modes: root-level (legacy) or `orgs/{orgId}/{collection}` subcollection

**AiRouter:**
- Purpose: Route AI tasks to the best available provider with health-aware fallback
- Examples: `packages/server/src/services/ai/AiRouter.ts`
- Pattern: Singleton via `getAiRouter()`; four task types (`web_search`, `structured_extraction_json`, `freeform_generation`, `vision_analysis`); provider preference is task-specific (Perplexity for web search, OpenAI for vision); circuit-breaker-like health tracking (3 failures in 5 min = unhealthy for 60s)

**Shared Schemas:**
- Purpose: Single Zod schema definitions used for runtime validation on server and static typing on frontend
- Examples: `packages/shared/src/schemas/product.ts`, `packages/shared/src/schemas/evaluation.ts`
- Pattern: Each schema file exports a `FooSchema` (ZodObject) and `type Foo = z.infer<typeof FooSchema>`; aliased as `@shared/schemas` via TypeScript path alias

**ApiError (dual definition):**
- Backend: `packages/server/src/lib/errors.ts` — `ApiError` with `code`, `message`, `details`, `status`; `formatApiError()` builds `{ error: { code, message } }` shape
- Frontend: `src/lib/api.ts` — `ApiError` with `message` and `status` for HTTP-level error wrapping

## Entry Points

**Backend:**
- Location: `packages/server/src/server.ts`
- Triggers: `node packages/server/src/server.ts` (guarded by `import.meta.url` check)
- Responsibilities: Express app factory, route mounting, global error middleware, exports `app` for testing

**Frontend:**
- Location: `src/main.tsx`
- Triggers: Vite dev server or production build
- Responsibilities: ReactDOM.createRoot, mounts `<LuxselleApp />` + `<SpeedInsights />`

**Frontend App Shell:**
- Location: `src/LuxselleApp.tsx`
- Responsibilities: Provider tree (QueryClientProvider, ServerStatusProvider, BrowserRouter, LayoutModeProvider, ResearchSessionProvider); two layout branches (overview vs sidecar); mobile nav, DockBar, breadcrumbs, ErrorBoundary, AnimatedRoutes

**Route Definitions:**
- Location: `src/components/layout/AnimatedRoutes.tsx`
- Pattern: All 11 routes defined with `React.lazy()`; wrapped in `AnimatePresence` + `PageTransition` for enter/exit animations

## Error Handling

**Strategy:** Errors bubble via Express `next(error)`; centralized global error handler in `packages/server/src/server.ts` classifies and formats all errors.

**Patterns:**
- ZodError from request body validation → 400 with `{ error: { code: "VALIDATION_ERROR", fieldErrors } }`
- `ApiError` thrown in route/service → status from `ApiError.status`, code from `ApiError.code`
- Body parse errors (`SyntaxError`) → 400
- Upload limit errors → 400
- Unknown errors → 500; debug details included if request header `X-Debug: 1` is set
- Frontend `ApiError` parses `error.message` from backend response body for user-facing toasts

## Cross-Cutting Concerns

**Logging:** Structured JSON via `logger` from `packages/server/src/middleware/requestId.ts`; emits `request_start`, `request_end`, `ai_router_task_success`, `ai_router_task_failure`, `validation_error`, `unhandled_error` events

**Validation:** Zod schemas in `packages/shared/src/schemas/` used at three points: request body parsing in routes, document parse in `BaseRepo.parseDoc()`, and AI response validation in `AiRouter.extractStructuredJson()`

**Authentication:** Firebase ID token verification in `packages/server/src/middleware/auth.ts`; role hierarchy `admin > operator > readOnly`; globally disabled (`app.use('/api', requireAuth)` is commented out) for MVP; `SKIP_AUTH=true` env var bypasses auth in development

**Idempotency:** `X-Idempotency-Key` header supported via `packages/server/src/middleware/idempotency.ts`; responses stored in Firestore `idempotency_keys` collection for 24h replay; available for use on critical mutation routes

---

*Architecture analysis: 2026-03-02*
