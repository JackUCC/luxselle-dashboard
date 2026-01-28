# Luxselle Dashboard MVP - Implementation Plan

Phases 0–6 are **complete**. Phase 7 (tests + polish) is **in progress**.

---

## Phase 0: Repo Audit + Docs + Plan ✅

**Status**: Complete

### Tasks
- [x] Inspect repo structure
- [x] Create PRD.md
- [x] Create ARCHITECTURE.md (in `docs/design/`)
- [x] Create DECISIONS.md (in `docs/design/`)
- [x] Create PLAN.md (this file)
- [x] Create Firebase docs (in `docs/firebase/`)
- [x] Identify mock data locations (N/A - no mock data exists yet)

### Acceptance Criteria
- All documentation files exist in `docs/` (root, `design/`, and `firebase/`)
- Architecture clearly documented
- Plan has checkboxes for tracking

---

## Phase 1: Firebase Emulator + Data Layer + Seed

**Status**: Complete

### Tasks
- [x] Setup npm workspace structure
  - [x] Create `server/` directory with Express app
  - [x] Create `shared/` directory for types/schemas
  - [x] Update root `package.json` with workspace config
- [x] Install dependencies
  - [x] Firebase Admin SDK
  - [x] Firebase Emulator Suite
  - [x] Express, zod, other server deps
  - [x] React Router, UI components (if needed)
- [x] Firebase configuration
  - [x] Create `firebase.json` with emulator config
  - [x] Create `firestore.rules` (allow all for MVP)
  - [x] Create `firestore.indexes.json`
  - [x] Setup Firebase Admin init in `server/src/config/firebase.ts`
  - [x] Handle emulator vs real Firebase via env vars
- [x] Shared schemas (Zod)
  - [x] `shared/src/schemas/product.ts`
  - [x] `shared/src/schemas/supplier.ts`
  - [x] `shared/src/schemas/supplierItem.ts`
  - [x] `shared/src/schemas/buyingListItem.ts`
  - [x] `shared/src/schemas/transaction.ts`
  - [x] `shared/src/schemas/evaluation.ts`
  - [x] `shared/src/schemas/activityEvent.ts`
  - [x] `shared/src/schemas/sourcingRequest.ts`
  - [x] `shared/src/schemas/settings.ts`
  - [x] `shared/src/schemas/systemJob.ts`
- [x] Repository layer
  - [x] Base `FirestoreRepo` class with common CRUD
  - [x] `ProductRepo` extends FirestoreRepo
  - [x] `SupplierRepo` extends FirestoreRepo
  - [x] `SupplierItemRepo` extends FirestoreRepo
  - [x] `BuyingListItemRepo` extends FirestoreRepo
  - [x] `TransactionRepo` extends FirestoreRepo
  - [x] `EvaluationRepo` extends FirestoreRepo
  - [x] `ActivityEventRepo` extends FirestoreRepo
  - [x] `SourcingRequestRepo` extends FirestoreRepo
  - [x] `SettingsRepo` (singleton pattern)
  - [x] `SystemJobRepo` extends FirestoreRepo
- [x] Seed script
  - [x] Create `server/scripts/seed.ts`
  - [x] Seed 50 products with images (placeholder URLs)
  - [x] Seed 20 supplier items
  - [x] Seed 10 sourcing requests
  - [x] Seed 15 buying list items
  - [x] Seed 30 transactions
  - [x] Seed default settings document
  - [x] Make seed idempotent (clear + recreate)
- [x] Environment configuration
  - [x] Create `.env.example` with all required vars
  - [x] Create `server/src/config/env.ts` with zod validation
  - [x] Document env vars in README
- [x] Dev scripts
  - [x] `npm run dev` starts emulators + backend + frontend concurrently
  - [x] `npm run seed` runs seed script
  - [x] `npm run emulators` starts only Firebase emulators
- [x] Wire Inventory view to Firestore
  - [x] Create basic Inventory component structure
  - [x] Fetch products from Firestore (via API)
  - [x] Display products in table/grid
  - [x] Remove any mock data arrays

### Acceptance Criteria
- ✅ Firebase emulators start successfully
- ✅ Seed script runs and creates all sample data
- ✅ Inventory view shows products from Firestore (not mocks)
- ✅ All repos have basic CRUD working
- ✅ `npm run dev` starts everything with one command
- ✅ Environment variables properly configured

---

## Phase 2: Buying List Receive Flow

**Status**: Complete

### Tasks
- [x] Buying List API endpoints
  - [x] `GET /api/buying-list` - List with filters
  - [x] `POST /api/buying-list` - Create item
  - [x] `PUT /api/buying-list/:id` - Update item
  - [x] `DELETE /api/buying-list/:id` - Delete item
- [x] Buying List UI
  - [x] List view with status badges
  - [x] Group-by-supplier view (placeholder)
  - [x] Status filters
  - [x] Message generator (placeholder "Coming soon")
- [x] Receive flow backend
  - [x] `POST /api/buying-list/:id/receive` endpoint
  - [x] Service: Create product from buying list item
  - [x] Service: Create transaction (purchase type)
  - [x] Service: Create activity event
  - [x] Service: Update buying list item status to "received"
- [x] Receive flow UI
  - [x] "Receive" button on buying list items
  - [x] Confirmation dialog
  - [x] Success feedback
  - [ ] Navigate to inventory after receive (optional)

### Acceptance Criteria
- ✅ Can create buying list items manually
- ✅ Can update buying list item status
- ✅ "Receive" creates product, transaction, and activity event
- ✅ Product appears in inventory after receive
- ✅ Activity feed shows receive event

---

## Phase 3: Supplier Hub CSV Import

**Status**: Complete

### Tasks
- [x] Supplier CRUD API
  - [x] `GET /api/suppliers` - List suppliers
  - [x] `POST /api/suppliers` - Create supplier
  - [x] `PUT /api/suppliers/:id` - Update supplier
  - [x] `DELETE /api/suppliers/:id` - Delete supplier
- [x] CSV import service
  - [x] Parse CSV (use csv-parse library)
  - [x] Map Brand Street Tokyo columns
  - [x] Convert USD to EUR using settings.fxUsdToEur
  - [x] Create/update supplier items
  - [x] Handle duplicates (by externalId)
  - [x] Create system_job record
  - [x] Create activity event
- [x] CSV import API
  - [x] `POST /api/suppliers/import` - Accept multipart/form-data
  - [x] Validate file type and size
  - [x] Return import results (success count, errors)
- [x] Supplier Hub UI
  - [x] Supplier list/profile view
  - [x] CSV upload form
  - [x] Import progress/results display
  - [x] Unified supplier items feed (`GET /api/suppliers/items/all`)
  - [ ] Filters (supplier, availability, brand) — optional enhancement
  - [x] "Add to buy list" button on supplier items

### Acceptance Criteria
- ✅ Can create suppliers
- ✅ Can upload Brand Street Tokyo CSV
- ✅ CSV import creates supplier items correctly
- ✅ USD prices converted to EUR
- ✅ Supplier items appear in unified feed
- ✅ "Add to buy list" from supplier item works
- ✅ System job records import status

---

## Phase 4: Evaluator Backend + UI Integration

**Status**: Complete

### Tasks
- [x] Pricing provider abstraction
  - [x] Create `IPricingProvider` interface
  - [x] Implement `MockPricingProvider` (deterministic)
  - [x] Implement `OpenAIProvider` (when API key present)
  - [x] Implement `GeminiProvider` (when API key present)
- [x] Pricing service
  - [x] `PricingService` selects provider based on env
  - [x] Calculate `maxBuyPriceEur` from `estimatedRetailEur` and `targetMarginPct`
  - [x] Query `TransactionRepo` for `historyAvgPaidEur` (similar brand/model)
  - [x] Return comps array (mock for MVP)
  - [x] Return confidence score
- [x] Pricing API
  - [x] `POST /api/pricing/analyse` - Accept evaluation input
  - [x] Validate input with zod
  - [x] Call pricing service
  - [x] Return analysis results
- [x] Evaluation persistence
  - [x] Save evaluation to Firestore after analysis
  - [x] Link evaluation to buying list item if "Add to buy list" clicked
- [x] Evaluator UI
  - [x] Form with all input fields
  - [x] "Analyse" button
  - [x] Display results (estimated retail, max buy price, history avg, comps, confidence)
  - [x] "Save evaluation" (persisted on analyse)
  - [x] "Add to buy list" button (creates buying list item linked to evaluation)

### Acceptance Criteria
- ✅ Mock pricing provider works without API keys
- ✅ Analysis returns all required fields
- ✅ History avg paid queries transactions correctly
- ✅ Max buy price calculation uses target margin
- ✅ Evaluations saved to Firestore
- ✅ "Add to buy list" from evaluator creates buying list item
- ✅ OpenAI provider works when API key provided (optional test)

---

## Phase 5: Dashboard KPIs + Activity + System Status

**Status**: Complete

### Tasks
- [x] KPI calculations
  - [x] Total Inventory Value: sum `costPriceEur` where `status=in_stock`
  - [x] Pending Buy List Value: sum `targetBuyPriceEur` where `status IN [pending, ordered]`
  - [x] Active Sourcing Pipeline: sum `budget` where `status IN [open, sourcing]`
  - [x] Low Stock Alerts: count where `quantity < lowStockThreshold`
- [x] KPI API
  - [x] `GET /api/dashboard/kpis` - Return all KPIs
  - [x] Recalculate on each request
- [x] Activity feed API
  - [x] `GET /api/dashboard/activity` - Return recent activity events (limit query)
  - [x] Order by `createdAt` descending
- [x] System status API
  - [x] `GET /api/dashboard/status` - Return system status
  - [x] Last supplier import job status
  - [x] AI provider mode (mock/openai/gemini)
  - [x] Firebase mode (emulator/real)
- [x] Dashboard UI
  - [x] KPI cards (4 cards)
  - [x] Recent activity feed (scrollable list)
  - [x] System status widget
- [x] "Ask Luxselle..." command bar (basic routing by intent)

### Acceptance Criteria
- ✅ All KPIs calculate correctly
- ✅ Activity feed shows recent events
- ✅ System status displays current configuration
- ✅ Command bar routes to correct views
- ✅ Dashboard loads without errors

---

## Phase 6: Sourcing Module

**Status**: Complete

### Tasks
- [x] Sourcing API endpoints
  - [x] `GET /api/sourcing` - List sourcing requests
  - [x] `POST /api/sourcing` - Create request
  - [x] `PUT /api/sourcing/:id` - Update request
  - [x] `DELETE /api/sourcing/:id` - Delete request
- [x] Status flow handling
  - [ ] Validate status transitions (Open → Sourcing → Sourced → Fulfilled/Lost) — Phase 7
  - [x] Create activity events on status changes
- [x] Linking
  - [x] Link sourcing request to product (linkedProductId)
  - [x] Link sourcing request to supplier item (linkedSupplierItemId)
- [x] Sourcing UI
  - [x] List view with status filters
  - [x] Create/edit form
  - [x] Status change dropdown
  - [ ] Link product/supplier item UI (API supports via body; optional UI)
- [x] Pipeline KPI (already in Phase 5)

### Acceptance Criteria
- ✅ Can CRUD sourcing requests
- ✅ Status transitions work correctly
- ✅ Can link to products and supplier items
- ✅ Pipeline KPI includes sourcing requests
- ✅ Activity events created on status changes

---

## Phase 7: Tests + Polish

**Status**: Pending

### Tasks
- [ ] Unit tests
  - [x] Max buy price calculation
  - [ ] FX conversion (USD to EUR)
  - [ ] Status transition validation
  - [ ] CSV import mapping
- [x] E2E smoke test
  - [x] Evaluator → Add to buy list → Receive → Inventory shows item
  - [x] Use Playwright or similar
- [ ] Error handling
  - [ ] API error responses consistent
  - [ ] Frontend error boundaries
  - [ ] Toast notifications for errors
- [ ] Loading states
  - [ ] Loading spinners on async operations
  - [ ] Skeleton screens for data loading
- [ ] Empty states
  - [ ] Empty inventory message
  - [ ] Empty buying list message
  - [ ] Empty supplier items message
- [ ] Type cleanup
  - [ ] Remove `any` types
  - [ ] Ensure all types from zod schemas
  - [ ] Remove dead code
- [ ] Documentation
  - [x] README with setup instructions
  - [ ] API documentation (OpenAPI/Swagger optional)
  - [x] Environment variables documented

### Acceptance Criteria
- ✅ Unit tests pass
- ✅ E2E smoke test passes
- ✅ No TypeScript errors
- ✅ No console errors in browser
- ✅ All empty states handled
- ✅ Loading states on all async operations
- ✅ Error messages user-friendly

---

## Summary

**Total Phases**: 7 (Phases 0–6 complete, Phase 7 in progress)

**Phase 7 done**: README with setup/env; E2E smoke test.

**Phase 7 remaining**: Unit tests (FX, status transitions, CSV mapping), consistent API error shape + toast (no alert), loading/empty states, type cleanup. Optional: apiPost/apiPut/apiDelete, status transition validation on PUT /api/sourcing/:id.

**Estimated Timeline** (Phase 7 remaining): 1–2 days of focused polish.
