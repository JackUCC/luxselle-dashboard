# Codebase Concerns

**Analysis Date:** 2026-03-02

---

## Tech Debt

**Global auth middleware disabled for MVP:**
- Issue: `app.use('/api', requireAuth)` is commented out in `packages/server/src/server.ts:160`. The import of `requireAuth` is also commented out on line 28. Every API endpoint is unauthenticated at the middleware layer.
- Files: `packages/server/src/server.ts`
- Impact: All business data (products, invoices, sourcing requests, market research) is accessible to anyone who can reach the Railway URL. Individual routes use `requireRole()` but `requireRole` does not verify a token — it only checks `req.user`, which is never populated without the global `requireAuth` layer.
- Fix approach: Uncomment `app.use('/api', requireAuth)` and the import. Add route-level exemptions only for endpoints that genuinely require public access (none currently identified).

**`requireRole` without `requireAuth` provides no real protection:**
- Issue: Routes such as `GET /api/products`, `GET /api/invoices`, `GET /api/dashboard/kpis`, `POST /api/pricing/price-check`, and all `/api/ai/*` routes have no auth middleware at all. Routes that do use `requireRole` (write operations) rely on `req.user` being set, but with the global middleware disabled, `req.user` is always `undefined`, so `requireRole` always falls through to `next(new ApiError(UNAUTHORIZED))` — blocking write operations while reads remain wide open.
- Files: `packages/server/src/routes/products.ts`, `packages/server/src/routes/invoices.ts`, `packages/server/src/routes/dashboard.ts`, `packages/server/src/routes/pricing.ts`, `packages/server/src/routes/ai.ts`, `packages/server/src/routes/market-research.ts`
- Impact: All GET endpoints and AI endpoints are fully public.
- Fix approach: Re-enable global auth middleware (see above). Audit which GETs genuinely need auth.

**`x-user-id` header treated as identity in savedResearch:**
- Issue: `packages/server/src/routes/savedResearch.ts:14` reads `req.headers['x-user-id']` as the userId for all saved-research operations, falling back to `'default-user'`. This is a spoofable, arbitrary header — any caller can claim any identity.
- Files: `packages/server/src/routes/savedResearch.ts`
- Impact: Saved research records are not reliably scoped to authenticated users. Once auth is re-enabled, this pattern must be replaced with `req.user.uid`.
- Fix approach: Replace `getUserId` helper with `(req as AuthenticatedRequest).user?.uid` after global auth is restored.

**Duplicate import of `requireRole` in products.ts:**
- Issue: `requireRole` is imported twice from `../middleware/auth` — once on line 19 (within a destructured import that also includes `requireAuth`) and again as a standalone import on line 33.
- Files: `packages/server/src/routes/products.ts`
- Impact: TypeScript compiles this without error (ES module re-export semantics), but it is a code smell indicating the file received multiple independent edits and was not reconciled.
- Fix approach: Remove the duplicate import on line 33.

**`sell-with-invoice` multi-document write is not atomic:**
- Issue: `POST /api/products/:id/sell-with-invoice` creates a transaction, updates a product, creates an invoice, and creates an activity event via four sequential Firestore writes (`packages/server/src/routes/products.ts:768-829`). There is no Firestore batch or transaction wrapping these operations.
- Files: `packages/server/src/routes/products.ts`
- Impact: A server crash or timeout between any two writes leaves the database in a partially-committed state (e.g. a transaction record exists but the product is still marked `available`, or an invoice exists without a product status update).
- Fix approach: Wrap all four writes in a `db.runTransaction()` or `db.batch()`. The invoice-number counter (`invoiceRepo.getNextInvoiceNumber`) also needs to run inside the transaction to prevent duplicate invoice numbers under concurrent requests.

**`POST /api/products/:id/transactions` is also non-atomic:**
- Issue: The same three-write pattern (transaction create → product status update → activity event) in `packages/server/src/routes/products.ts:699-753` has no Firestore transaction wrapper.
- Files: `packages/server/src/routes/products.ts`
- Impact: Same partial-write risk as sell-with-invoice.
- Fix approach: Consolidate into a Firestore batch commit.

**All data retrieval uses unbounded `.list()` full-collection scans:**
- Issue: `BaseRepo.list()` (`packages/server/src/repos/BaseRepo.ts:68`) has no limit, ordering, or streaming. Every call fetches the entire Firestore collection into memory. Called in: `routes/products.ts`, `routes/dashboard.ts` (twice), `routes/invoices.ts`, `routes/sourcing.ts`, `routes/jobs.ts`, `routes/suppliers.ts`, `routes/dashboard.ts` (activityRepo), `services/pricing/PricingService.ts` (transactions + products), `services/import/SupplierEmailSyncService.ts` (jobs + suppliers).
- Files: `packages/server/src/repos/BaseRepo.ts`, `packages/server/src/routes/products.ts`, `packages/server/src/routes/dashboard.ts`, `packages/server/src/services/pricing/PricingService.ts`
- Impact: Latency and memory cost grow linearly with collection size. Dashboard and pricing endpoints load all products AND all transactions simultaneously. The products endpoint then performs in-process JavaScript sort and cursor pagination on the full result set.
- Fix approach: Add Firestore query limits and server-side ordering to `BaseRepo.list()`. For dashboard KPIs use aggregate queries. For products list, push sort/filter into Firestore queries rather than in-memory JS.

**In-process JavaScript sort and text search for products list:**
- Issue: `GET /api/products` fetches all products, then sorts and text-searches them in Node.js memory (`packages/server/src/routes/products.ts:395-432`). The comment on line 395 says "simple client-side for now".
- Files: `packages/server/src/routes/products.ts`
- Impact: With hundreds or thousands of products, this holds the full dataset in Node memory per request, adds JS-sort overhead, and cannot leverage Firestore indexes.
- Fix approach: Use Firestore `orderBy()` + `startAfter()` for cursor pagination; use a search index (Algolia or Typesense) or Firestore full-text extension for text search.

**`SupplierEmailSyncService.getStatus()` does a full unbounded job list scan:**
- Issue: `getStatus()` calls `this.jobRepo.list()` and then sorts/filters in memory to find the last sync job (`packages/server/src/services/import/SupplierEmailSyncService.ts:66-68`). This is called on every `GET /api/suppliers/email/status` request.
- Files: `packages/server/src/services/import/SupplierEmailSyncService.ts`
- Impact: Grows with total job count over time. The status endpoint is likely polled frequently by the UI.
- Fix approach: Query Firestore with `.where('jobType', '==', 'supplier_email_sync').orderBy('createdAt', 'desc').limit(1)`.

**In-process job runner not suitable for production scale:**
- Issue: `packages/server/src/services/JobRunner.ts:4` documents that the job runner is in-process: "For production at scale, replace with a queue (e.g. Bull/BullMQ) or cron-triggered worker." Jobs run as fire-and-forget async calls within the Express HTTP handler, with no durability guarantees if the process restarts.
- Files: `packages/server/src/services/JobRunner.ts`, `packages/server/src/routes/jobs.ts`
- Impact: Any server restart during a running job silently abandons it. The job's status remains `running` in Firestore permanently until manually reset.
- Fix approach: Migrate to BullMQ with Redis, or use a Cloud Tasks / Cloud Run Job pattern for Railway deployments.

**`supplier_import` job type cannot be retried:**
- Issue: `JobRunner.ts:48-55` explicitly marks `supplier_import` jobs as failed with the message "Re-execution not supported: supplier_import requires original file upload." Retrying via the UI produces a user-visible error.
- Files: `packages/server/src/services/JobRunner.ts`
- Impact: Users who see a failed import have no self-service retry path via the Jobs UI.
- Fix approach: Store the original parsed rows or the Firestore path to the uploaded file during import, then replay them in the job runner.

---

## Security Considerations

**CORS allows localhost in production:**
- Risk: The production CORS configuration in `packages/server/src/server.ts:52` includes `/localhost(:\d+)?$/` and `/127\.0\.0\.1(:\d+)?$/` in `defaultProductionOrigins`. In production (`NODE_ENV=production`) these patterns are still included alongside `.vercel.app` origins.
- Files: `packages/server/src/server.ts`
- Current mitigation: None. The patterns are always applied in production.
- Recommendations: Remove localhost/127.0.0.1 regexes from `defaultProductionOrigins`. They are only needed in development, where `allowedOrigins` is already set to `true` (allow all).

**`SKIP_AUTH=true` env flag silently bypasses all auth:**
- Risk: If `SKIP_AUTH=true` is set in any deployed environment (or leaked into a production `.env`), all requests are serviced as `admin` user `dev@luxselle.local` without token verification.
- Files: `packages/server/src/middleware/auth.ts:40-49`, `packages/server/src/config/env.ts:60`
- Current mitigation: Flag is `optional()` in the Zod env schema; documentation says "development only".
- Recommendations: Add an explicit check that `SKIP_AUTH` cannot be `true` when `NODE_ENV=production`. Throw at startup if this combination is detected.

**`X-Debug: 1` header exposes full stack traces in production:**
- Risk: Any caller who sends `X-Debug: 1` in a request header receives the full `err.stack` in the error response JSON (`packages/server/src/server.ts:248-252`). This can expose internal file paths and framework details.
- Files: `packages/server/src/server.ts`
- Current mitigation: None — the header check applies in all environments.
- Recommendations: Gate the debug response on `NODE_ENV !== 'production'` in addition to the header check, or restrict to authenticated admin users only.

**`console.error` leaks auth token verification errors:**
- Risk: `packages/server/src/middleware/auth.ts:76` logs raw Firebase auth errors to stdout via `console.error`. These errors may contain partial token data or internal Firebase error codes that aid in debugging the auth bypass surface.
- Files: `packages/server/src/middleware/auth.ts`
- Current mitigation: None.
- Recommendations: Replace `console.error` with `logger.warn` (the structured logger from `middleware/requestId.ts`) so error details are only in structured logs, not raw stdout.

---

## Known Bugs / Incomplete Features

**Visual search embedding is a mock — no real image similarity:**
- Issue: `packages/server/src/services/visualSearch/EmbeddingService.ts` is explicitly documented as a mock implementation: "deterministic vector from URL/buffer hash. Replace with FashionCLIP or fashion-image-feature-extractor for real similarity." `embedFromUrl()` just hashes the URL string — two images of the same bag from different URLs produce completely unrelated vectors.
- Files: `packages/server/src/services/visualSearch/EmbeddingService.ts`, `packages/server/src/services/visualSearch/VisualSearchPipeline.ts`, `packages/server/src/services/visualSearch/VisualSearchService.ts`
- Impact: Visual search (`POST /api/search/visual`) returns meaningless similarity results. Feature is non-functional.
- Fix approach: Integrate a real embedding model (FashionCLIP via Python microservice, or OpenAI `text-embedding-3-small` on image descriptions as an interim step).

**`savedResearch` userId is always a spoofed/default value:**
- Issue: As described in the tech debt section, the `getUserId` helper in `packages/server/src/routes/savedResearch.ts:14` reads an arbitrary request header. With auth disabled globally, all saved research is attributed to `'default-user'`.
- Files: `packages/server/src/routes/savedResearch.ts`
- Impact: All users see each other's saved research; data cannot be filtered per user.

**`supplier_email_sync` disabled by default:**
- Issue: `SupplierEmailSyncService.sync()` throws `'Supplier email sync is disabled'` if `SUPPLIER_EMAIL_ENABLED` is falsy (`packages/server/src/services/import/SupplierEmailSyncService.ts:82-84`). The feature requires Gmail OAuth credentials that are not part of standard setup.
- Files: `packages/server/src/services/import/SupplierEmailSyncService.ts`
- Impact: The Jobs UI retry flow for `supplier_email_sync` fails if the feature is not configured.
- Fix approach: Surface a clear UI state when the feature is unconfigured, rather than returning a runtime error after the user triggers a retry.

---

## Performance Bottlenecks

**Dashboard KPIs endpoint loads all products + all transactions + all sourcing + all activity in parallel:**
- Problem: `GET /api/dashboard/kpis` and `GET /api/dashboard/profit-summary` each call `productRepo.list()` and `transactionRepo.list()` simultaneously (`packages/server/src/routes/dashboard.ts:25-27`, `115-117`). The `/activity` endpoint loads all activity events unbounded (`dashboard.ts:72`).
- Files: `packages/server/src/routes/dashboard.ts`
- Cause: No aggregate queries or pagination; full collection scans on every dashboard load.
- Improvement path: Use Firestore `count()` aggregations for KPI counts. Cache computed KPIs with a short TTL (60s). Apply `.limit()` to activity and job queries.

**PricingService historical average loads all transactions + all products:**
- Problem: `getHistoricalAveragePurchasePrice()` in `packages/server/src/services/pricing/PricingService.ts:286-323` calls `this.transactionRepo.list()` and `this.productRepo.list()` to compute a single average price. This is triggered on every pricing analysis request.
- Files: `packages/server/src/services/pricing/PricingService.ts`
- Cause: No indexed query on `transaction.type + product.brand + product.model`.
- Improvement path: Add a Firestore composite index on `(type, productId)` and query only purchase transactions for matched product IDs.

**In-memory sort + slice pagination for invoices and sourcing:**
- Problem: `GET /api/invoices` and `GET /api/sourcing` also do full `.list()` then in-memory sort/filter, same pattern as products (`packages/server/src/routes/invoices.ts:280`, `packages/server/src/routes/sourcing.ts:41`).
- Files: `packages/server/src/routes/invoices.ts`, `packages/server/src/routes/sourcing.ts`
- Cause: Same structural issue as products — list then JS-sort.
- Improvement path: Push orderBy/limit into Firestore queries.

---

## Fragile Areas

**AiRouter singleton state could persist across test runs:**
- Files: `packages/server/src/services/ai/AiRouter.ts`
- Why fragile: `getAiRouter()` returns a module-level singleton. The singleton holds `providerHealth` and `lastProviderByTask` state between requests. In tests that don't mock the module import path, state from one test can influence another.
- Safe modification: Tests should use `vi.mock()` on the singleton factory or reinitialize the module between tests. The existing test suite uses mocking but new tests must follow the same pattern.
- Test coverage: `AiRouter.test.ts` and `AiRouter.matrix.test.ts` cover the router, but provider health circuit-breaker behavior under partial failures has limited coverage.

**`sell-with-invoice` partial-write on network failure (see Tech Debt):**
- Files: `packages/server/src/routes/products.ts`
- Why fragile: Four sequential non-transactional Firestore writes. A Railway timeout on the third write leaves a sold product and a transaction record without an invoice.
- Safe modification: Do not add more writes to this handler without wrapping all writes in `db.runTransaction()` first.
- Test coverage: `products.test.ts` covers the happy path but does not test partial-failure scenarios.

**FxService in-memory cache is process-local:**
- Files: `packages/server/src/services/fx/FxService.ts`
- Why fragile: The FX rate cache is a singleton in process memory. On Railway with multiple instances or after a restart, each process fetches fresh rates independently from Frankfurter. Under high load this can produce bursts of outbound FX API requests. On Frankfurter failure (silent `catch {}` on line 39), the cache is populated with hardcoded default rates (`USD: 1.08, GBP: 0.85, JPY: 165`) which may be significantly stale.
- Safe modification: Consider adding a Firestore-backed shared cache for FX rates, or using Redis if available.
- Test coverage: No test file for `FxService.ts`.

**JSON.parse without try-catch in `routes/pricing.ts:247`:**
- Files: `packages/server/src/routes/pricing.ts`
- Why fragile: `JSON.parse(jsonMatch[0])` on line 247 is outside the surrounding try-catch scope. A malformed AI response that passes the regex match but is invalid JSON would produce an uncaught exception that bypasses the global error handler's structured response.
- Safe modification: Wrap the parse in a try-catch or use `JSON.parse` inside the existing outer `try` block.
- Test coverage: `pricing.test.ts` covers normal responses; malformed-JSON edge case is not tested.

**`ComparableImageEnrichmentService` silently swallows all image extraction errors:**
- Files: `packages/server/src/services/search/ComparableImageEnrichmentService.ts`
- Why fragile: Lines 136, 150, 194, and 222 all have bare `catch {}` blocks that return `null` or empty arrays without logging. Failures in image URL extraction are completely invisible in logs.
- Safe modification: Add at minimum a `logger.debug()` in each catch to aid future debugging.
- Test coverage: `ComparableImageEnrichmentService.test.ts` exists and covers several paths, but error paths are not verified.

---

## Test Coverage Gaps

**Zero frontend component or page tests:**
- What's not tested: All 17 page components in `src/pages/` and 47 components in `src/components/` have no unit or integration tests. Only 5 utility library files have tests (`src/lib/`).
- Files: `src/pages/`, `src/components/`
- Risk: UI regressions (rendering errors, broken data flows, incorrect state management) are only caught manually.
- Priority: High — the frontend is the primary user interface.

**No tests for critical services: InvoicePdfService, FxService, JobRunner, visual search pipeline:**
- What's not tested: `packages/server/src/services/InvoicePdfService.ts`, `packages/server/src/services/fx/FxService.ts`, `packages/server/src/services/JobRunner.ts`, `packages/server/src/services/visualSearch/EmbeddingService.ts`, `packages/server/src/services/visualSearch/VisualSearchPipeline.ts`, `packages/server/src/services/visualSearch/VisualSearchService.ts`, `packages/server/src/services/price-check/ComparableEnrichmentService.ts`.
- Risk: Changes to PDF generation, FX conversion, job execution, or visual search indexing have no regression coverage.
- Priority: High for `InvoicePdfService` and `JobRunner` (financial document generation; job state machine). Medium for others.

**No tests for routes: `ai.ts`, `fx.ts`, `vat.ts`, `market-research` trending/competitor-feed, `suppliers` GET routes:**
- What's not tested: The AI generation routes (`/api/ai/*`), FX rate endpoint, VAT calculation endpoint, and supplier list GET have no route-level tests.
- Files: `packages/server/src/routes/ai.ts`, `packages/server/src/routes/fx.ts`, `packages/server/src/routes/vat.ts`, `packages/server/src/routes/suppliers.ts`
- Risk: Regressions in AI prompt dispatch, VAT calculation edge cases, or supplier data retrieval are undetected until production.
- Priority: Medium.

**Multi-tenancy / org isolation not tested:**
- What's not tested: No test verifies that data from one `orgId` cannot be read by a request authenticated as a different `orgId`. The `BaseRepo` supports org subcollections but all routes currently use `DEFAULT_ORG_ID`.
- Files: `packages/server/src/repos/BaseRepo.ts`
- Risk: If multi-tenancy is enabled in the future without this test coverage, cross-org data leakage could occur silently.
- Priority: Medium — becomes High if multi-tenancy is activated.

---

## Dependencies at Risk

**`xlsx` package included directly in products route (large, infrequently-maintained):**
- Risk: `xlsx` (SheetJS community edition) is imported directly in `packages/server/src/routes/products.ts:32`. The community edition has had historical security issues and is large. It is only used for Excel import in the product import flow.
- Impact: Bundle size impact on server startup; potential CVE exposure.
- Migration plan: Use `exceljs` as a lighter, actively-maintained alternative, or confine the import to a dedicated import service rather than the route file.

---

*Concerns audit: 2026-03-02*
