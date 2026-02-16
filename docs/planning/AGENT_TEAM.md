# Luxselle Dashboard — Agent Team Architecture

A team of page-specific agents that improve UX, flow, and capabilities per page, with a vision toward a **Jarvis-like** dashboard that thinks and acts proactively, preempting needs and surfacing insights before the user asks.

---

## Vision: Jarvis-like Dashboard

The dashboard should:

1. **Think ahead** — Surface anomalies, opportunities, and risks without being asked.
2. **Act autonomously** — Suggest or auto-trigger safe actions (e.g., low-stock alerts, reorder suggestions).
3. **Predict needs** — Show what the user is likely to need next based on context and history.
4. **Preemptive output** — Deliver concise, actionable summaries rather than raw data dumps.
5. **Unified intelligence** — Cross-page awareness so insights connect (e.g., sourcing + inventory + buy list).

---

## Agent Team Overview

| Agent | Page | Route | Primary Focus |
|-------|------|-------|---------------|
| **Dashboard Agent** | Dashboard | `/` | KPIs, activity, command bar, cross-page insights |
| **Inventory Agent** | Inventory | `/inventory` | Products, drawer, transactions, VAT |
| **Evaluator Agent** | BuyBox | `/buy-box` | Pricing, evaluations, add to buy list |
| **Supplier Hub Agent** | SupplierHub | `/supplier-hub` | Suppliers, CSV import, unified feed |
| **Sourcing Agent** | Sourcing | `/sourcing` | Sourcing requests, status flow, pipeline |
| **Buying List Agent** | BuyingList | `/buying-list` | Buy list items, receive flow, messages |
| **Jobs Agent** | Jobs | `/jobs` | System jobs, import status, retries |
| **Invoices Agent** | Invoices | `/invoices` | Invoices list, creation, links |

---

## QA + Documentation Swarm

Use these agents when the goal is release confidence, regression prevention, and clearer operator guidance.

| Agent | Role | Primary Outputs |
|-------|------|-----------------|
| **Quality Lead Agent** | Orchestrates QA and docs work across all areas | Release-readiness verdict, severity-ranked findings, prioritized backlog |
| **Backend Contracts QA Agent** | Validates API contracts, schema compatibility, deterministic business logic | Test findings, missing coverage list, minimal backend patch recommendations |
| **Frontend Flows QA Agent** | Verifies critical user journeys and UX state quality | Flow pass/fail checklist, regression report, manual QA script |
| **Data Pipeline QA Agent** | Validates supplier email ingestion/mapping/dedupe/cron readiness | Pipeline readiness status, operational risks, required owner inputs |
| **Docs Improvement Agent** | Keeps docs/runbooks/deploy instructions aligned with code | Updated docs, exact commands, open questions list |

Recommended execution order:
1. Quality Lead sets scope and acceptance gates.
2. Backend Contracts + Frontend Flows + Data Pipeline run in parallel where possible.
3. Docs Improvement updates runbooks from verified behaviour.
4. Quality Lead issues final readiness report.

Reference runbook: `docs/planning/QA_SWARM_PLAYBOOK.md`.

---

## Per-Page: Current APIs, Next-Level APIs, and Jarvis Behaviours

### 1. Dashboard Agent (`/`)

**Current APIs:**
- `GET /api/dashboard/kpis` — Total inventory, pending buy list, active sourcing pipeline, low stock
- `GET /api/dashboard/profit-summary` — Cost, revenue, profit, margin
- `GET /api/dashboard/activity?limit=5` — Recent activity feed
- `GET /api/dashboard/status` — AI provider, Firebase mode, last import
- `GET /api/vat/calculate` — VAT calculation

**Next-level APIs to add:**
- `GET /api/dashboard/insights` — AI-curated insights (anomalies, opportunities, risks)
- `GET /api/dashboard/predictions` — Predicted low stock, margin trends, buy list recommendations
- `POST /api/dashboard/command` — Natural language command bar → routed action or query
- `GET /api/dashboard/digest` — Daily/weekly digest summary (text for "Ask Luxselle…")

**Jarvis behaviours:**
- Proactively surface "Low stock on 3 items" with one-click to inventory filtered view
- Show "Pending buy list value increased 15% — review?" when threshold crossed
- Command bar: "Show me Chanel Classic Flap" → navigates + pre-filters
- Preemptive: "You may want to receive the 2 ordered Louis Vuitton items" when items are ready

---

### 2. Inventory Agent (`/inventory`)

**Current APIs:**
- `GET /api/products` — List products
- `GET /api/products/:id` — Product detail
- `PUT /api/products/:id` — Update product
- `POST /api/products/:id/images` — Upload image
- `DELETE /api/products/:id/images/:imageId` — Delete image
- `GET /api/products/:id/transactions` — Product transactions
- `POST /api/products/:id/transactions` — Add transaction
- `GET /api/vat/calculate` — VAT calc
- `POST /api/invoices` — Create invoice

**Next-level APIs to add:**
- `GET /api/products?recommendSell=1` — Suggest sell prices for in-stock items
- `GET /api/products/:id/valuation` — Historical valuation trend
- `POST /api/products/bulk-status` — Bulk status update (e.g., mark several as sold)
- `GET /api/products/export` — Export to CSV/Excel for reporting

**Jarvis behaviours:**
- Pre-fill sell price suggestion based on comps when editing
- Proactive: "2 items below margin target — consider repricing?"
- Empty state: "Add from Evaluator or receive from Buying List"
- Drawer: Show "Similar items sold for €X–€Y" from transaction history

---

### 3. Evaluator Agent (`/buy-box`)

**Current APIs:**
- `POST /api/pricing/analyse` — Analyse item, get estimated retail, max buy, comps
- `POST /api/buying-list` — Add to buying list
- `GET /api/products` — List products (for Add to buy list flow)
- Image extraction endpoint (extract brand/model from image)

**Next-level APIs to add:**
- `POST /api/pricing/batch-analyse` — Analyse multiple items at once (e.g., CSV)
- `GET /api/pricing/trends?brand=X&model=Y` — Price trend for brand/model
- `POST /api/pricing/suggest-condition` — AI-suggest condition from image
- WebSocket or polling: `GET /api/pricing/job/:id` — Long-running analysis status

**Jarvis behaviours:**
- Pre-fill from clipboard or last evaluation
- Proactive: "3 similar items in Supplier Hub — compare prices?"
- After analyse: "Add to buy list with 1 click" — one-tap add
- Suggest condition from image upload before user fills form

---

### 4. Supplier Hub Agent (`/supplier-hub`)

**Current APIs:**
- `GET /api/suppliers` — List suppliers
- `GET /api/suppliers/items/all` — Unified supplier items feed
- `POST /api/suppliers/import` — CSV import
- Add to buy list via `POST /api/buying-list`

**Next-level APIs to add:**
- `GET /api/suppliers/items/all?recommend=1` — Items that match open sourcing or buy list criteria
- `POST /api/suppliers/import/url` — Import from URL (e.g., Google Drive CSV link)
- `GET /api/suppliers/items/:id/price-history` — Price change over imports
- Webhook or polling: `GET /api/suppliers/import/job/:id` — Import job progress

**Jarvis behaviours:**
- After CSV import: "5 items match your sourcing requests — view?"
- Proactive: "New items from Brand Street Tokyo — 3 below your max buy"
- Empty state: "Upload CSV or paste URL to import"
- Suggest "Add to buy list" with pre-filled target price from Evaluator logic

---

### 5. Sourcing Agent (`/sourcing`)

**Current APIs:**
- `GET /api/sourcing` — List sourcing requests
- `POST /api/sourcing` — Create request
- `PUT /api/sourcing/:id` — Update request (including status)
- `DELETE /api/sourcing/:id` — Delete request

**Next-level APIs to add:**
- `GET /api/sourcing/match-supplier-items` — Supplier items that match open sourcing requests
- `POST /api/sourcing/:id/auto-match` — AI-suggest best supplier items for a request
- `GET /api/sourcing/pipeline-summary` — Value by status, ageing
- `POST /api/sourcing/:id/link-product` — Link to product (API exists; ensure UI)

**Jarvis behaviours:**
- Proactive: "3 open requests have potential matches in Supplier Hub"
- Status change: Suggest link to product when moving to Sourced
- Empty state: "Create a request or import from Supplier Hub"
- Pipeline view: "2 requests ageing > 7 days — follow up?"

---

### 6. Buying List Agent (`/buying-list`)

**Current APIs:**
- `GET /api/buying-list` — List items
- `POST /api/buying-list` — Create item
- `PUT /api/buying-list/:id` — Update item
- `POST /api/buying-list/:id/receive` — Receive item

**Next-level APIs to add:**
- `GET /api/buying-list/messages?supplierId=X` — Generate WhatsApp/Email messages per supplier
- `POST /api/buying-list/bulk-receive` — Receive multiple items at once
- `GET /api/buying-list/summary` — Value by status, by supplier
- `POST /api/buying-list/:id/remind` — Schedule reminder for follow-up

**Jarvis behaviours:**
- Proactive: "2 items ready to receive — one click to inventory"
- Message generator: Pre-fill WhatsApp/Email with item details
- Group by supplier: "Send 1 message for Supplier X (3 items)"
- Empty state: "Add from Evaluator or Supplier Hub"

---

### 7. Jobs Agent (`/jobs`)

**Current APIs:**
- `GET /api/jobs` — List system jobs
- `POST /api/jobs/:id/retry` — Retry failed job

**Next-level APIs to add:**
- `GET /api/jobs/:id/logs` — Job execution logs
- `POST /api/jobs/supplier-import/schedule` — Schedule recurring import (e.g., daily)
- `GET /api/jobs/health` — Overall system health (all job types)

**Jarvis behaviours:**
- Proactive: "Last import failed — retry?" toast or banner
- Show progress for long-running imports (polling or WebSocket)
- Empty/healthy: "All systems operational"

---

### 8. Invoices Agent (`/invoices`)

**Current APIs:**
- `GET /api/invoices` — List invoices

**Next-level APIs to add:**
- `POST /api/invoices` — Create invoice (from product/transaction)
- `GET /api/invoices/:id` — Invoice detail
- `GET /api/invoices/:id/pdf` — Generate or download PDF
- `PUT /api/invoices/:id` — Update invoice
- `GET /api/invoices/summary` — Total by period, by status

**Jarvis behaviours:**
- Proactive: "3 sold items have no invoice — create?"
- From Inventory drawer: "Create invoice" flows into Invoices
- Empty state: "Create invoices from sold products in Inventory"

---

## Cross-Cutting: Unified Intelligence Layer

To achieve Jarvis-like behaviour across pages:

1. **Insights API** — `GET /api/insights` aggregates anomalies and opportunities from all domains.
2. **Command routing** — Dashboard command bar parses intent and routes to appropriate page + pre-filters.
3. **Event-driven suggestions** — When data changes (e.g., CSV import, receive), trigger cross-page suggestions.
4. **Digest API** — `GET /api/dashboard/digest` returns a text summary for "Ask Luxselle…" or notifications.

---

## How to Use the Agent Team

Each page has a corresponding Cursor agent in `.cursor/agents/`:

- `agent-dashboard.md`
- `agent-inventory.md`
- `agent-evaluator.md`
- `agent-supplier-hub.md`
- `agent-sourcing.md`
- `agent-buying-list.md`
- `agent-jobs.md`
- `agent-invoices.md`

When working on a specific page, invoke the corresponding agent to ensure UX, flow, capability, and API improvements align with this vision.

---

## Testing Strategy for Agent Work

Each agent should:

1. **Test** — Run `npm run test` and `npm run test:e2e` after changes.
2. **QA** — Verify loading states, empty states, toasts (no `alert()`).
3. **Flow** — Ensure critical paths work end-to-end (e.g., Evaluator → Buy list → Receive → Inventory).
4. **API** — Validate new APIs return the standard error shape on failure.

---

## Changelog

- **2025-02-13** — Initial Agent Team architecture and per-page API/UX/Jarvis specs.

---

## Iteration Swarm (Global Codebase Optimizer)

Use this swarm when the goal is not one page, but **systematic improvement across the whole repository**.

| Agent | Agent File | Role |
|------|------------|------|
| Codebase Optimizer | `.cursor/agents/agent-codebase-optimizer.md` | Orchestrates sprint scope, priorities, and consolidation |
| Frontend UX Optimizer | `.cursor/agents/agent-frontend-ux-optimizer.md` | Improves page-level UX and interaction quality |
| Backend Reliability Optimizer | `.cursor/agents/agent-backend-reliability-optimizer.md` | Hardens API contracts and deterministic server behavior |
| Data Pipeline Optimizer | `.cursor/agents/agent-data-pipeline-optimizer.md` | Improves supplier ingestion resilience and observability |
| Test Hardening | `.cursor/agents/agent-test-hardening.md` | Expands automated confidence and release gates |

### Launching the swarm

From repository root:

```bash
npm run agents:launch
```

To launch plus execute validation checks in one run:

```bash
npm run agents:launch -- --run-checks
```
