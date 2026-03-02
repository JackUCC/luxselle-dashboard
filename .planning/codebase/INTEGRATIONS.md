# External Integrations

**Analysis Date:** 2026-03-02

## APIs & External Services

**AI Providers (dual-provider with routing):**
- OpenAI — structured JSON extraction, freeform text generation, vision analysis (GPT-4o-mini for text, GPT-4o for vision), web search via Responses API
  - SDK: `openai` npm package v6.17
  - Auth: `OPENAI_API_KEY` env var
  - Used in: `packages/server/src/services/ai/AiRouter.ts`
  - Models: `gpt-4o-mini` (text/extraction/web_search), `gpt-4o` (vision)

- Perplexity AI — web search and structured extraction; preferred for `web_search` tasks
  - SDK: Native `fetch` to `https://api.perplexity.ai/chat/completions`
  - Auth: `PERPLEXITY_API_KEY` env var (Bearer token in Authorization header)
  - Used in: `packages/server/src/services/ai/AiRouter.ts`
  - Models: configured via `PERPLEXITY_SEARCH_MODEL` (default: `sonar`) and `PERPLEXITY_EXTRACTION_MODEL` (default: `sonar`)

**AI Routing:** Dynamic multi-provider routing via `AiRouter` singleton (`packages/server/src/services/ai/AiRouter.ts`). Routing mode controlled by `AI_ROUTING_MODE` env var: `dynamic` (health-aware with fallback), `openai` (force OpenAI only), `perplexity` (force Perplexity only). Task preferences: web_search → Perplexity first; structured_extraction/freeform/vision → OpenAI first. Vision tasks OpenAI-only.

**Currency Exchange:**
- Frankfurter — free FX rates API; fetches live EUR-based rates
  - Endpoint: `https://api.frankfurter.app/latest?base=EUR`
  - Auth: None (public API)
  - Used in: `packages/server/src/services/fx/FxService.ts`
  - Cache: in-memory, 1-hour TTL; falls back to hardcoded defaults (USD 1.08, GBP 0.85, JPY 165) on failure

## Data Storage

**Databases:**
- Firebase Firestore — primary document database for all app data
  - Connection: `FIREBASE_PROJECT_ID` (default: `luxselle-dashboard`), `FIRESTORE_DATABASE_ID` (optional, for secondary eur3 instance)
  - Client: `firebase-admin` SDK (`getFirestore`)
  - Initialized in: `packages/server/src/config/firebase.ts`
  - Local emulator: port 8082 (configured in `firebase/firebase.json`)
  - Collections: `products`, `suppliers`, `supplierItems`, `invoices`, `sourcingRequests`, `settings`, `systemJobs`, `activityEvents`, `transactions`, `savedResearch`, `imageEmbeddings`, `evaluations`
  - Multi-tenancy: `BaseRepo` supports org subcollections (`orgs/{orgId}/{collection}`) or legacy root-level with `organisationId` field filter
  - All repos extend `BaseRepo` at `packages/server/src/repos/BaseRepo.ts`

**File Storage:**
- Firebase Storage — product images and invoice PDF uploads
  - Bucket: `FIREBASE_STORAGE_BUCKET` (default: `luxselle-dashboard.firebasestorage.app`)
  - Client: `firebase-admin` SDK (`getStorage`)
  - Initialized in: `packages/server/src/config/firebase.ts`
  - Local emulator: port 9198

**Caching:**
- In-memory only (no Redis or external cache)
- FX rates: `FxService` private in-memory cache with 1-hour TTL
- Search enrichment: configurable TTL via `SEARCH_ENRICHMENT_CACHE_TTL_MS` (default 300000ms = 5 min)

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication — ID token verification on the backend
  - Implementation: `packages/server/src/middleware/auth.ts`
  - Backend verifies `Bearer` tokens via `firebase-admin/auth` `verifyIdToken()`
  - Custom claims: `role` (UserRole: `admin` | `operator` | `readOnly`) and `orgId`
  - Middleware: `requireAuth` (mandatory), `requireRole(...roles)` (role guard), `optionalAuth` (populate if present)
  - Dev bypass: set `SKIP_AUTH=true` to skip all auth checks (sets `role: 'admin'`, `orgId: 'default'`)
  - Note: `requireAuth` is currently disabled on all routes at the server level (commented out in `packages/server/src/server.ts` — "Disabled temporarily for MVP")

## Email Integration

**Gmail API (Google):**
- Used for supplier email sync — reads supplier price list CSV/XLSX attachments from a shared Gmail inbox
- SDK: `googleapis` npm package v140
- Auth: OAuth2 with `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER` env vars
- Enabled/disabled via `SUPPLIER_EMAIL_ENABLED` env var (default: false)
- Implemented in: `packages/server/src/services/import/SupplierEmailSyncService.ts`
- Triggered via: `POST /api/suppliers/email/sync` or `npm run supplier-email-sync`
- Default query: `has:attachment newer_than:30d` (configurable via `SUPPLIER_EMAIL_DEFAULT_QUERY`)
- Max attachment size: 10MB (configurable via `SUPPLIER_EMAIL_MAX_ATTACHMENT_MB`)

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc.)
- Custom in-process error counter via `errorTracker` in `packages/server/src/middleware/requestId.ts`

**Performance (Frontend):**
- `@vercel/speed-insights` — Vercel's built-in Core Web Vitals tracking; included in React app

**Logs:**
- Custom structured logger (`logger`) in `packages/server/src/middleware/requestId.ts`
- Logs include `requestId` (UUID per request), log level, event name, and structured metadata
- All route handlers call `next(error)` for centralized error logging in the global error handler

## CI/CD & Deployment

**Hosting:**
- Frontend: Vercel — configured via `vercel.json`; SPA routing rewrites all paths to `index.html`; Vite build to `dist/`
- Backend: Railway — configured via `railway.toml`; nixpacks builder, Node 22, starts `@luxselle/server` workspace

**CI Pipeline:**
- None detected (no GitHub Actions workflows or CircleCI config found)
- Manual release gates listed in `config/vitest.config.ts` comment: `npm run test`, `npm run typecheck`, `npm run build`

## Environment Configuration

**Required env vars (backend):**
- `FIREBASE_PROJECT_ID` — Firestore project (default: `luxselle-dashboard`)
- `FIREBASE_STORAGE_BUCKET` — Storage bucket (default: `luxselle-dashboard.firebasestorage.app`)
- `FIREBASE_USE_EMULATOR` — `true` for local dev, `false` for production
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` — JSON-serialized service account (preferred for Railway)
- `GOOGLE_APPLICATION_CREDENTIALS` — path to service account file (alternative)
- `OPENAI_API_KEY` — required if using OpenAI provider
- `PERPLEXITY_API_KEY` — required if using Perplexity provider
- `AI_ROUTING_MODE` — `dynamic` | `openai` | `perplexity` (default: `dynamic`)
- `PORT` — server port (default: 3001)
- `FRONTEND_ORIGINS` — comma-separated allowed CORS origins for production

**Optional env vars:**
- `FIRESTORE_DATABASE_ID` — secondary Firestore database ID (e.g., eur3 instance)
- `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER` — for supplier email sync
- `SUPPLIER_EMAIL_ENABLED` — enable/disable email sync feature (default: false)
- `SKIP_AUTH` — `true` to bypass auth middleware in development
- `SEARCH_ENRICHMENT_ENABLED` — enable/disable search enrichment (default: true)
- `SEARCH_ENRICHMENT_MAX_COUNT` — max enrichment results (default: 25)
- `PRICE_CHECK_V2_ENABLED` — feature flag for new price check logic
- `BASE_CURRENCY` — base currency for pricing calculations (default: `EUR`)
- `TARGET_MARGIN_PCT` — target margin percentage (default: 35)

**Required env vars (frontend):**
- `VITE_API_BASE` — backend URL for production (e.g., `https://your-app.up.railway.app`); uses Vite proxy to `localhost:3001` in dev

**Secrets location:**
- `.env` file at project root (gitignored; `.env.example` was the reference but is currently deleted per git status)

## Webhooks & Callbacks

**Incoming:**
- None detected (no webhook receiver endpoints)

**Outgoing:**
- None detected (no outgoing webhook dispatch)

---

*Integration audit: 2026-03-02*
