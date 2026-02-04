# Luxselle Dashboard MVP - Product Requirements Document (Iteration 4)

## Overview
Ship a working Luxselle Dashboard MVP with real data flow (Firebase), seeded sample data, and a clean phased plan. The app does NOT need to be production-ready; it MUST be usable end-to-end locally.

## Hard Constraints
- Preserve the existing UI framework and styling. Do not rewrite the app structure unless unavoidable.
- No auth for Iteration 4. Assume a single workspace/organisation ("default").
- Use Firebase:
  - Firestore for data
  - Firebase Storage for images
- All AI calls must be server-side (never from the browser).
- The app must run locally with zero paid services by default:
  - Firebase Emulator first (default)
  - Mock AI provider first (default)
- Provide an easy switch to real services via env vars.

## Primary Workflows (must work end-to-end)

### 1) Inventory CRUD
Create product → upload images → edit cost/sell → status changes → appears in inventory + KPIs.

### 2) Evaluate → Buy list → Receive
Enter item → Analyse (mock/AI) → add to buying list → "Receive" creates an inventory item + transaction + activity event.

### 3) Supplier CSV import
Import Brand Street Tokyo CSV → items appear in Supplier Hub → "Add to buy list" works → Receive works.

## App Views

### A) Dashboard (Command Centre)
- "Ask Luxselle…" command bar routes by intent:
  - brand/model query → inventory filtered
  - "buy / evaluate" → evaluator
  - "supplier" → supplier hub
  - "sourcing" → sourcing
- Command bar parses keywords and forwards filters via query params:
  - Inventory: `q`, `brand`, `model`
  - Evaluator: `brand`, `model`
  - Suppliers: `focus=import` when import intent is detected
  - Sourcing: `status` when a status keyword is present
- Example queries: "Chanel Classic Flap", "buy Louis Vuitton Neverfull", "supplier import", "sourcing open requests"
- KPI cards:
  - Total Inventory Value (sum cost where status=in_stock)
  - Pending Buy List Value (sum target_buy_price where status=pending/ordered)
  - Active Sourcing Pipeline (sum budgets where status=open/sourcing)
  - Low Stock Alerts (count quantity < threshold)
- Recent Activity Feed (activity_events)
- System Status widget:
  - last supplier import job status
  - AI provider mode (mock/openai/gemini)
  - emulator vs real Firebase

### B) Inventory
- Table + Grid toggle
- Filters: brand, status, condition, date added range, price range
- Product drawer: images, details, linked transactions, linked evaluations
- CRUD + image upload to Firebase Storage
- Fields show cost vs sell side-by-side
- Pagination (server-side if needed)

### C) Evaluator / Buy Box
Inputs: brand, model, category, condition grade, colour, notes, supplier ask (optional)

On Analyse:
- estimated_retail (EUR)
- max_buy_price (EUR) based on TARGET_MARGIN_PCT
- history_avg_paid (EUR) from transactions for similar items
- comps[] list (mock unless comps provider enabled)
- confidence score

Actions:
- Save evaluation
- Add to buying list (creates buying_list_item linked to evaluation)

### D) Supplier Hub
- Supplier profiles
- CSV import (manual upload is enough for MVP; CSV URL later)
- Unified global feed (supplier_items) with filters
- "Add to buy list" creates buying_list_item with supplier snapshot

### E) Sourcing
- CRUD requests: customer name, query text, brand optional, budget, priority, status, notes
- Status flow: Open → Sourcing → Sourced → Fulfilled / Lost
- Link to product or supplier item
- Pipeline value KPI

### F) Buying List
- Line items with source: manual / evaluator / supplier
- Group-by-supplier view
- Message generator per supplier:
  - WhatsApp and Email text (can be template-generated; store per supplier optional)
- Status flow: Pending → Ordered → Received → Cancelled
- Receive action:
  - Creates product in inventory
  - Creates transaction (purchase)
  - Writes activity event
  - Updates buying list item to received

## Data Model (Firestore collections; include organisationId = "default")

### Top-level collections:
- products
- suppliers
- supplier_items
- sourcing_requests
- buying_list_items
- transactions
- evaluations
- activity_events
- settings
- system_jobs

### Minimal document shapes (use TypeScript + zod validation shared between server/client):

#### settings
- baseCurrency: "EUR"
- targetMarginPct: 35
- lowStockThreshold: 2
- fxUsdToEur: number (default 0.92; editable later)

#### products
- brand, model, category, condition, colour
- costPriceEur, sellPriceEur, currency="EUR"
- status: in_stock | sold | reserved
- quantity (default 1)
- imageUrls: string[]
- notes

#### supplier_items
- supplierId
- externalId (SKU if present else hash)
- title, brand, sku, rank/condition
- askPriceUsd (raw)
- askPriceEur (converted using fxUsdToEur at import time)
- sellingPriceUsd (if present), sellingPriceEur (optional)
- availability: uploaded | sold | waiting
- imageUrl, sourceUrl (e.g., google drive folder link)
- rawPayload (object)
- lastSeenAt

#### buying_list_items
- sourceType: manual | evaluator | supplier
- supplierId?, supplierItemId?, evaluationId?
- brand, model, category, condition, colour
- targetBuyPriceEur
- status: pending | ordered | received | cancelled
- notes

#### transactions
- type: purchase | sale | adjustment
- productId? and/or buyingListItemId?
- amountEur
- occurredAt
- notes

#### evaluations
- input fields
- estimatedRetailEur, maxBuyPriceEur, historyAvgPaidEur
- comps[]
- confidence
- provider: mock | openai | gemini
- createdAt

#### activity_events
- actor (string like "system" for now)
- eventType (product_created, product_updated, evaluation_run, supplier_import, buylist_added, buylist_received, etc.)
- entityType + entityId
- payload

#### system_jobs
- jobType (supplier_import)
- status (success/fail/running)
- lastRunAt, lastSuccessAt, lastError

## Supplier CSV Mapping (Brand Street Tokyo)
Importer accepts the supplier CSV and maps these columns:
- STATUS → availability:
  - UPLOADED → uploaded
  - SOLD → sold
  - WAITING → waiting
- Brand → brand
- SKU → externalId + sku
- Rank → conditionRank
- For you in USD → askPriceUsd (parse number)
- Selling Price → sellingPriceUsd (parse number if present)
- Title → title
- URL column containing world-switch image link → imageUrl
- Google drive folder URL column → sourceUrl
- Store all columns into rawPayload

## Currency
- Base currency is EUR.
- Supplier imports are typically USD; convert using settings.fxUsdToEur.
- Keep both raw USD and converted EUR.

## AI Pricing / Analysis
Implement provider abstraction:
- MockPricingProvider (default, deterministic)
- OpenAIProvider (enabled when OPENAI_API_KEY present and AI_PROVIDER=openai)
- GeminiProvider (enabled when GEMINI_API_KEY present and AI_PROVIDER=gemini)

Endpoint: POST /api/pricing/analyse

Input: brand, model, category, condition, colour, notes, askPriceEur?

Output must include:
- estimatedRetailEur
- maxBuyPriceEur = estimatedRetailEur * (1 - targetMarginPct/100)
- historyAvgPaidEur (query transactions for similar brand/model)
- comps[] (mock unless comps provider later)
- confidence (0–1)

MVP preference:
- Use MockPricingProvider as default so everything works immediately.
- Implement OpenAIProvider next for richer analysis (still without live scraping).
- Leave live scraping as a later pluggable provider.

## Non-Functional Requirements
- Deterministic local dev: seeds + mocks.
- No secrets committed. Use .env and .env.example.
- Basic tests:
  - unit test for maxBuyPrice math + fx conversion
  - one E2E smoke: evaluator → add to buy list → receive → inventory shows item

## Environment Variables

### Server:
- AI_PROVIDER=mock|openai|gemini
- OPENAI_API_KEY (optional)
- GEMINI_API_KEY (optional)
- BASE_CURRENCY=EUR
- TARGET_MARGIN_PCT=35

### Firebase:
- FIREBASE_USE_EMULATOR=true (default)
- FIREBASE_PROJECT_ID (optional)
- FIREBASE_STORAGE_BUCKET (optional)
- GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json (optional for real Firebase)

### Frontend:
- if needed, VITE_FIREBASE_* vars OR reuse existing firebaseConfig in repo

## Runnability
- Provide single command dev runner (e.g., pnpm dev) that starts:
  - firebase emulators
  - backend API
  - frontend
