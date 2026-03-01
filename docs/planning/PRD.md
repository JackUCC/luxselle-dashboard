# Luxselle Supplier Engine — Product Requirements

## Overview

Build a Supplier Engine that helps operators make faster, safer buying decisions while browsing external supplier websites.

The product has two adaptive modes:

1. **Overview mode** for full operations planning.
2. **Sidecar mode** for compact decision support during live buying.

## Product Goals

1. Calculate reliable decision metrics quickly (market price, max buy, landed cost).
2. Bring inventory context into each decision (stock, status, sell-through signals).
3. Keep sourcing workflows actionable from evaluator output.
4. Preserve invoicing as a stable downstream operational feature.

## Non-Goals

1. Reintroducing procurement queue pages.
2. Reintroducing supplier-feed browsing pages.
3. Building a browser extension in this phase (web app sidecar mode only).

## Primary Workflows

### 1) Price Check During Live Browsing

1. User enters brand/model/condition and supplier ask.
2. System returns estimated retail, max buy, landed cost, and confidence.
3. User decides: source now, inventory-check first, or skip.

### 2) Inventory-Aware Decision Loop

1. User jumps from evaluator to relevant inventory context.
2. User validates stock and financial context.
3. Decision updates sourcing activity or is parked for later.

### 3) Sourcing Pipeline Execution

1. User creates or updates sourcing request from evaluator context.
2. Status transitions are validated (`open -> sourcing -> sourced -> fulfilled|lost`).
3. Dashboard and jobs surfaces reflect operational state.

### 4) Invoicing Follow-up

1. User opens invoices route after sourcing/stock actions.
2. Invoice list and creation/export flows remain operational.

## Mode Requirements

### Overview Mode

1. Full KPI and activity context on dashboard.
2. Rich table and drawer workflows in inventory.
3. Complete evaluator and sourcing forms with supporting metadata.

### Sidecar Mode

1. Optimized for narrow viewport (target 300-420 px width).
2. Prioritize top decision metrics above fold.
3. Keep key actions reachable with minimal scrolling.
4. Maintain consistent navigation and route behavior.

## Functional Requirements

### Dashboard

- KPIs: inventory value, low-stock count, sourcing pipeline state, profitability signals.
- Activity feed and system status remain visible and stable.

### Sourcing Intelligence (`/evaluate`)

- Inputs: brand, model, category, condition, color, notes, supplier ask.
- Optional serial/date-code context for age-adjusted guidance.
- Outputs: estimated retail, max buy, landed cost, confidence, market context.
- Supports sidecar-optimized presentation.

### Inventory (`/inventory`)

- Product lookup, detail drawer, transaction history, and stock status.
- Supports quick context checks from evaluator.

### Sourcing (`/sourcing`)

- CRUD requests with validated status transitions.
- Links to products and decision context where available.

### Invoices (`/invoices`)

- List and create/export flow must remain operational in both modes.

## Data and API Requirements

1. Maintain standard API error shape:
   `{ "error": { "code": string, "message": string, "details"?: object } }`
2. Keep successful response contracts backward compatible where possible.
3. Keep landed-cost and pricing math deterministic and test-covered.
4. Keep ingestion/job status observable via jobs/dashboard endpoints.

## Quality and Validation

1. Unit tests for pricing math and sourcing transitions must pass.
2. Typecheck and build must pass on each milestone.
3. E2E smoke should cover:
   - dashboard load
   - evaluator decision flow
   - inventory navigation
   - invoices route access
4. Sidecar checks must confirm compact usability and no blocked actions.
