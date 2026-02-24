# Sidecar UX GSD Agent Execution Plan

## Objective

Ship Supplier Engine Sidecar mode as a high-confidence decision companion for live buying workflows.

Primary outcomes:

1. Fast market-price + landed-cost checks.
2. Inventory-aware buy/no-buy context in compact layout.
3. Reliable handoff from evaluation to sourcing and invoicing workflows.

## Inputs and Constraints

1. Product scope: Supplier Engine (Overview + Sidecar).
2. Keep: Evaluator, Inventory, Sourcing, Invoices, Jobs.
3. No large refactors; prioritize focused incremental patches.
4. Existing GSD and Cursor agent framework already installed.

## Plugin/Tool Inventory (Cursor Marketplace)

### 1) BrowserStack plugin

Use for sidecar quality across viewport + browsers:

- `setupBrowserStackAutomateTests`
- `startAccessibilityScan`
- `fetchAccessibilityIssues`

### 2) Firebase plugin

Use for environment/rules checks impacting data reliability:

- `firebase_get_environment`
- `firebase_get_security_rules`

### 3) Context7 plugin

Use for up-to-date implementation guidance:

- `resolve-library-id`
- `query-docs`

### 4) Clerk plugin (deferred phase)

Not required for Sidecar UX phase; reserve for future auth UX phase.

### 5) Convex plugin (not active runtime here)

Installed but not part of current stack execution path; keep out of this phase unless architecture changes.

## GSD Workflow (Recommended Sequence)

1. Sync assets and health check
   - `npm run gsd:sync`
   - `npm run gsd:health`
2. Map current codebase for sidecar workstream
   - `/gsd:map-codebase sidecar inventory invoices evaluator`
3. Plan Sidecar phase with verification loop
   - `/gsd:plan-phase 7 --research`
4. Execute planned wave(s)
   - `/gsd:execute-phase 7`
5. Run conversational UAT + gap planning
   - `/gsd:verify-work 7`
   - if gaps found: `/gsd:plan-phase 7 --gaps`
   - execute gap closure: `/gsd:execute-phase 7 --gaps-only`

## Agent Waves

### Wave 1: Sidecar Surface Hardening

1. `agent-evaluator`
   - Compact hierarchy and frictionless action flow in sidecar.
2. `agent-inventory`
   - Compact stock context and reduced control clutter in sidecar.
3. `agent-invoices`
   - Modal/form density and primary actions optimized for narrow width.

### Wave 2: Cross-page Consistency

1. `agent-coordinator`
   - Ensure flow continuity: Evaluator -> Inventory -> Invoices.
   - Validate behavior parity between Overview and Sidecar.

### Wave 3: QA and Release Readiness

1. `agent-quality-lead` (orchestrator)
2. `agent-qa-frontend-flows` (mode-specific route checks)
3. `agent-qa-backend-contracts` (error shape and transition confidence)
4. `agent-qa-data-pipeline` (ingestion/regression sanity)
5. `agent-docs-improvement` (update runbooks and operator docs)

## Suggested Invocation Prompts

1. "Use the Evaluator agent to optimize sidecar quick-check flow for one-screen decision making."
2. "Use the Inventory agent to simplify sidecar inventory context checks without losing key stock and pricing signals."
3. "Use the Invoices agent to make sidecar invoice create/upload actions usable in compact width."
4. "Use the Coordinator agent to verify Evaluator to Inventory to Invoices flow in both overview and sidecar."
5. "Use Quality Lead to run release readiness with sidecar-focused gates."

## Validation Gates

1. `npm run test --workspace=@luxselle/server`
2. `npm run test`
3. `npm run build`
4. `npm run typecheck`
5. Optional sidecar e2e/browser checks:
   - `npm run test:e2e`
   - BrowserStack automate + accessibility scan

## Exit Criteria

1. Sidecar routes (`/`, `/buy-box`, `/inventory`, `/sourcing`, `/jobs`, `/invoices`) run without runtime errors.
2. Inventory and Invoices complete primary tasks in 300-420 px width.
3. QA swarm reports no P0 blockers.
4. Documentation reflects current Supplier Engine scope and sidecar operating model.
