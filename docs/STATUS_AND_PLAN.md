# Luxselle Dashboard — Status, Gap Analysis & Updated Plan

**Last updated**: 2026-01-27  
**Purpose**: Single source of truth for what exists now, what the plan/architecture expect, gaps, and what to do next.

---

## 1. Executive Summary

| Area | Current State | Plan Target | Gap |
|------|---------------|-------------|-----|
| **Phase 0** | Docs + plan exist | Complete | One N/A task left to tick |
| **Phase 1** | Implemented | Complete | Plan unchecked; small doc mismatch |
| **Phase 2** | Implemented | Complete | Plan unchecked; minor UI polish |
| **Phase 3** | Implemented | Complete | Plan unchecked; filters could be richer |
| **Phase 4** | Implemented | Complete | Plan unchecked |
| **Phase 5** | Implemented | Complete | Plan unchecked |
| **Phase 6** | Implemented | Complete | Plan unchecked; no status transition validation |
| **Phase 7** | Partial | Full polish | Unit tests, error/loading/empty states, types, README |

**Bottom line**: Phases 0–6 are functionally done; the plan file was never updated. Phase 7 (tests + polish) is the main remaining work.

---

## 2. What Exists Now (Current State)

### 2.1 Repo structure

```
luxselle-dashboard/
├── docs/              ✅ PRD, PLAN, STATUS_AND_PLAN; design/ (ARCHITECTURE, DECISIONS); firebase/ (FIREBASE_SETUP, FIREBASE_QUICK_REF)
├── src/                ✅ Frontend (React + Vite + Tailwind)
│   ├── components/
│   │   ├── dashboard/  ✅ DashboardView, CommandBar
│   │   ├── inventory/  ✅ InventoryView
│   │   ├── evaluator/  ✅ EvaluatorView
│   │   ├── supplier/   ✅ SupplierHubView
│   │   ├── buying-list/ ✅ BuyingListView
│   │   └── sourcing/   ✅ SourcingView
│   └── lib/           ✅ api.ts (apiGet), firebase.ts
├── server/             ✅ Express API
│   ├── src/
│   │   ├── config/    ✅ env.ts, firebase.ts
│   │   ├── repos/     ✅ All 10 repos (BaseRepo + 9 domain repos)
│   │   ├── routes/    ✅ products, buying-list, pricing, suppliers, dashboard, sourcing
│   │   └── services/  ✅ pricing/ (PricingService + providers), import/SupplierImportService
│   └── scripts/       ✅ seed.ts
├── shared/             ✅ Zod schemas (product, supplier, supplierItem, buyingListItem, …)
├── firebase.json       ✅ Emulator config (firestore, storage)
├── firestore.rules     ✅
├── firestore.indexes.json ✅
├── .env.example        ✅
└── package.json        ✅ workspaces [server, shared], scripts: dev, seed, emulators, test, test:e2e
```

- **Workspaces**: npm-style `workspaces: ["server","shared"]` in root. Plan says “pnpm” but behaviour is workspace-based; scripts use `npm run --workspace=@luxselle/server` etc.
- **Architecture doc** mentions `models/` under server and `pnpm-workspace.yaml`; in reality schemas live in `shared/src/schemas/` and there is no pnpm-workspace file. Otherwise layout matches.

### 2.2 Backend API (what’s implemented)

| Plan / ARCHITECTURE | Route | Implemented | Notes |
|--------------------|-------|-------------|--------|
| Products | GET/POST/PUT/DELETE /api/products, GET /:id | ✅ | All present |
| Products | POST /api/products/:id/images | ❌ | Not implemented |
| Buying List | GET/POST/PUT/DELETE /api/buying-list, GET /:id | ✅ | |
| Buying List | POST /api/buying-list/:id/receive | ✅ | Creates product, transaction, activity, sets status |
| Pricing | POST /api/pricing/analyse | ✅ | Persists evaluation, returns evaluationId |
| Suppliers | GET/POST/PUT /api/suppliers, GET /:id | ✅ | DELETE also present |
| Suppliers | GET /api/suppliers/:id/items | ✅ | |
| Suppliers | GET /api/suppliers/items/all | ✅ | Unified feed; route order fixed so it’s not shadowed by /:id |
| Suppliers | POST /api/suppliers/import | ✅ | multipart/form-data, supplierId in body |
| Sourcing | GET/POST/PUT/DELETE /api/sourcing, GET /:id | ✅ | |
| Dashboard | GET /api/dashboard/kpis | ✅ | |
| Dashboard | GET /api/dashboard/activity | ✅ | limit query |
| Dashboard | GET /api/dashboard/status | ✅ | aiProvider, firebaseMode, lastSupplierImport |
| Health | — | ✅ | GET /api/health (not in plan) |

### 2.3 Frontend views and behaviour

| View | Data source | Behaviours |
|------|-------------|------------|
| **Dashboard** | /dashboard/kpis, /dashboard/activity, /dashboard/status | KPI cards, activity feed, system status, CommandBar (“Ask Luxselle…”) |
| **Inventory** | GET /products | Table/grid, search (q, brand, model), no mock arrays |
| **Evaluator** | POST /pricing/analyse, POST /buying-list | Form → Analyse → results → “Add to Buying List”; uses raw fetch |
| **Supplier Hub** | GET /suppliers, GET /suppliers/items/all, POST /suppliers/import | Supplier list, CSV upload, unified items table, “Add to Buy List” per item |
| **Buying List** | GET /buying-list, POST /:id/receive | List, status filter, “Receive” with confirm; uses raw fetch for receive |
| **Sourcing** | GET /sourcing, POST /sourcing, PUT /sourcing/:id | List, status filter, create form, status dropdown; uses raw fetch for create/update |

- **Routing**: React Router; nav and routes align with plan (/, /inventory, /evaluator, /suppliers, /buying-list, /sourcing).
- **API client**: Only `apiGet` is used for reads. POST/PUT/DELETE use raw `fetch('/api/...')`; works with Vite proxy to backend.

### 2.4 Data layer and seed

- **Repos**: BaseRepo + ProductRepo, SupplierRepo, SupplierItemRepo, BuyingListItemRepo, TransactionRepo, EvaluationRepo, ActivityEventRepo, SourcingRequestRepo, SettingsRepo, SystemJobRepo. All used by routes/services.
- **Schemas**: All listed in plan exist under `shared/src/schemas/` (including base, index).
- **Seed**: Idempotent (clear then create). Actual counts:
  - Products: 90 (plan said 50)
  - Supplier items: 50 (plan said 20)
  - Sourcing requests: 28 (plan said 10)
  - Buying list items: 35 (plan said 15)
  - Transactions: 60 (plan said 30)
  - Evaluations: 15, activity events: 30, settings: 1, system_jobs: 2. No functional issue.

### 2.5 Configuration and scripts

- **Env**: `server/src/config/env.ts` with Zod; `.env.example` present. PLAN “document env vars in README” is not done (no README setup section).
- **Scripts**: `dev` (emulators + server + client), `seed` (via server workspace), `emulators` — all exist. Plan says “pnpm dev”; actual scripts use npm workspace commands.

---

## 3. What Should Be There (Plan & Architecture)

### 3.1 From PLAN.md

- **Phase 0**: All audit/doc tasks done; “Identify mock data locations (N/A)” still unchecked.
- **Phase 1**: All items (workspace, deps, Firebase, shared schemas, repos, seed, env, dev scripts, Inventory→Firestore) are done in code; plan still shows “Pending” and unchecked.
- **Phase 2**: Buying-list CRUD, receive backend, receive UI (button, confirm, success, navigate to inventory), list/status/grouping. Implemented except: “Navigate to inventory after receive” (optional UX), “Message generator (WhatsApp/Email)” and “Group-by-supplier” (placeholder only).
- **Phase 3**: Supplier CRUD, CSV import, Supplier Hub UI. Done; “Filters (supplier, availability, brand)” on unified feed could be deeper.
- **Phase 4**: Pricing providers, pricing service, POST /pricing/analyse, evaluation persistence, Evaluator UI. Done.
- **Phase 5**: KPIs, activity, system status, dashboard UI, command bar. Done.
- **Phase 6**: Sourcing CRUD, status flow, activity on status change. Done. Plan also asks for “Validate status transitions” and “Link sourcing request to product/supplier item” — backend allows linking via `linkedProductId` / `linkedSupplierItemId`; no dedicated “link product/supplier item” UI.
- **Phase 7**: Unit tests (only max-buy-price done), E2E (done), error/loading/empty states, type cleanup, README/env docs. Largely still to do.

### 3.2 From ARCHITECTURE.md

- **Directory layout**: Matches except `server/models/` and `pnpm-workspace.yaml` are not present; schemas live in `shared/`.
- **API list**: Matches implementation except POST /api/products/:id/images is not implemented.
- **Data flows**: Described flows (e.g. receive, evaluator, import) match current behaviour.

---

## 4. Gaps and Cleanups

### 4.1 Bugs / behaviour fixes already done in this pass

1. **Suppliers route order**  
   `GET /api/suppliers/items/all` was defined after `GET /api/suppliers/:id`, so a request to “/api/suppliers/items/all” was handled as “get supplier by id=items”. **Fixed** by defining `GET /items/all` before `GET /:id`.

2. **Dashboard activity payload typing**  
   `event.payload as any` in `getEventDescription` was replaced with `Record<string, unknown>` and safe access so activity feed typing is consistent and `any` is removed.

### 4.2 Gaps (optional or minor)

- **Product image upload**: POST /api/products/:id/images not implemented (ARCHITECTURE + PLAN).
- **Post-receive navigation**: Plan says “Navigate to inventory after receive”; current behaviour stays on Buying List. Optional UX improvement.
- **Buying List**: “Group by supplier” and “Message generator (WhatsApp/Email)” are placeholders (“Coming soon”).
- **Supplier Hub**: Unified feed has no filters (supplier, availability, brand). Plan lists them as desired.
- **Sourcing**: No explicit “link product” / “link supplier item” UI; API supports it via update body.
- **Sourcing status**: No server-side validation of status transitions (open→sourcing→sourced→fulfilled/lost). Phase 7 calls this out for unit tests.
- **lowStockThreshold**: Dashboard KPIs use a hardcoded `2`; plan mentions `quantity < lowStockThreshold`. Could be read from settings (seed already has `lowStockThreshold: 2`).

### 4.3 Consistency / polish (Phase 7)

- **API client**: Only `apiGet` exists. Adding `apiPost`, `apiPut`, `apiDelete` and using them from Evaluator, Buying List, Sourcing, Supplier Hub would centralise base URL and error handling.
- **Errors**: No shared toast/notification; views use `alert()` or inline error state. Plan asks for “Toast notifications for errors” and “API error responses consistent”.
- **Loading**: Views use local “Loading…” or “Analysing…”; plan asks for “Loading spinners” and “Skeleton screens” where appropriate.
- **Empty states**: Some views have “No …” messages; plan asks for explicit empty states for inventory, buying list, supplier items.
- **Types**: One remaining `any`-style use was in Dashboard payload; now tightened. Plan: “Remove any types”, “Ensure all types from zod schemas”.
- **README**: No setup/run instructions or env docs yet.

---

## 5. Updated Plan (What Needs Doing)

### 5.1 Plan file updates (no code change)

- **Phase 0**: Mark “Identify mock data locations (N/A - no mock data exists yet)” as done (e.g. “N/A” or “[x]”).
- **Phases 1–6**: Set status to “Complete” and check off implemented tasks. Optionally add short “Implemented YYYY-MM-DD” notes where useful.

### 5.2 Phase 7 — Tests + polish (actual work)

Prioritised list of what’s left:

| Priority | Task | Notes |
|----------|------|--------|
| **P1** | Unit tests | FX conversion (USD→EUR), status transition rules, CSV import mapping. Max-buy-price already covered. |
| **P1** | README + env docs | How to clone, install, `.env.example` copy, `npm run dev`, `npm run seed`, run e2e. |
| **P2** | Error handling | Consistent JSON error shape from API; frontend toast or shared error UI instead of `alert()`. |
| **P2** | Loading / empty states | Spinners or skeletons on async views; clear empty copy for inventory, buying list, supplier items. |
| **P2** | Type cleanup | Sweep for `any`, ensure types come from `@shared/schemas` where possible. |
| **P3** | Optional API client helpers | `apiPost`, `apiPut`, `apiDelete` and migrate POST/PUT calls to use them. |
| **P3** | Optional features | Post-receive→inventory navigation; lowStockThreshold from settings; product image upload endpoint. |
| **P3** | Docs | Sync ARCHITECTURE with reality (no `server/models/`, no `pnpm-workspace.yaml`); add “Current API” section if helpful. |

### 5.3 Suggested next steps (concise)

1. **Update PLAN.md**  
   Mark Phase 0 N/A task done; mark Phases 1–6 complete and tick implemented tasks.

2. **Phase 7 — high impact first**  
   - Add README with setup and env vars.  
   - Add the remaining unit tests (FX, status transitions, CSV mapping).  
   - Introduce a small, shared error/toast mechanism and use it in key flows (e.g. receive, add-to-buy-list, import).

3. **Phase 7 — polish**  
   - Loading and empty states.  
   - Replace any remaining `alert()` with the shared error/toast.  
   - Optional: `apiPost` / `apiPut` / `apiDelete` and refactor one or two views as a template.

4. **Optional product improvements**  
   - Navigate to Inventory after “Receive”.  
   - Read `lowStockThreshold` from settings in dashboard KPIs.  
   - Later: POST /api/products/:id/images and Supplier Hub filters.

---

## 6. Review Checklist: Done vs To Do

### Done (implemented and working)

- [x] Phase 0 docs and plan structure
- [x] Workspace layout (server, shared, frontend)
- [x] Firebase emulator, Firestore rules/indexes, env-driven config
- [x] Shared Zod schemas and all 10 repos
- [x] Seed script (idempotent, all collections)
- [x] Products API and Inventory view backed by API
- [x] Buying-list API and receive flow (backend + UI)
- [x] Supplier CRUD, CSV import, Supplier Hub with items feed and “Add to Buy List”
- [x] Pricing service + providers, POST /pricing/analyse, Evaluator UI and “Add to Buying List”
- [x] Dashboard KPIs, activity, system status, CommandBar
- [x] Sourcing CRUD, activity on create/status change
- [x] E2E smoke (evaluator → add to buy list → receive → inventory)
- [x] Fix suppliers route order for `/items/all`
- [x] Remove `any` in dashboard activity payload handling

### To do (from plan or this review)

- [x] Mark Phase 0 “mock data locations” as N/A in PLAN.md
- [x] Mark Phases 1–6 complete in PLAN.md and tick tasks
- [x] Unit tests: FX conversion, status transitions, CSV mapping
- [x] README: setup, env vars, dev/seed/e2e
- [x] Shared error/toast and consistent API error format
- [x] Loading and empty states across main views
- [x] Final type sweep (no stray `any`)
- [x] Error boundary for graceful error handling
- [ ] (Optional) apiPost/apiPut/apiDelete and refactor POST/PUT calls
- [ ] (Optional) Navigate to inventory after receive; lowStockThreshold from settings; product image upload

---

*This file is the main place to see “what’s there, what’s left, and what to do next.” Update it when big chunks of Phase 7 land or when scope changes.*
