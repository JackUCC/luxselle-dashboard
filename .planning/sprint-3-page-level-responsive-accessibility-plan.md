# Plan: Sprint 3 Continuation - Page-Level Responsive + Accessibility Sweep

**Generated**: 2026-03-02  
**Estimated Complexity**: High

## Overview
Continue Sprint 3 from the UX/UI polish program by executing the page-level responsive and accessibility sweep in three runnable increments.  
The sequence prioritizes high-frequency, data-dense workflows first (Inventory, Invoices, Jobs), then evaluator/research layout stability, then consistency/accessibility guardrails across secondary pages.

## Assumptions
- Sprint 1 artifacts are complete and available:
  - `docs/planning/ux-ui-responsive-audit-baseline.md`
  - `docs/planning/ux-ui-release-checklist.md`
  - `tests/e2e/responsive-shell.spec.ts`
- Sprint 2 shell/navigation/sidecar hardening is merged and stable.
- No new runtime dependencies are required for Sprint 3.

## Prerequisites
- `npm run dev` works for frontend + backend + emulator stack.
- Seed data is available: `npm run seed`.
- Playwright browser installed: `npm run e2e:install-browser`.
- Baseline defects RWD-002, RWD-003, RWD-004, RWD-005, RWD-007 are still treated as open until verified done.

## Sprint 3A: Data-Heavy Workflow Stabilization
**Goal**: Remove layout breakages and interaction risk in table-driven operational pages.  
**Demo/Validation**:
- Demo `/inventory`, `/invoices`, `/jobs` at `768x1024`, `1024x768`, and sidecar `340/420/480`.
- Confirm intentional horizontal scroll only where needed and clear overflow affordance.

### Task 3A.1: Standardize Table Containment Pattern
- **Location**: `src/pages/Inventory/InventoryView.tsx`, `src/pages/Invoices/InvoicesView.tsx`, `src/pages/Jobs/JobsView.tsx`
- **Description**: Normalize table wrapper/container classes so horizontal overflow is contained at panel level instead of page level.
- **Dependencies**: Sprint 2 complete
- **Acceptance Criteria**:
  - No page-level horizontal scrollbar in overview mode for the three pages.
  - Table-level overflow behavior is consistent and discoverable.
- **Validation**:
  - `npm run test:e2e -- tests/e2e/inventory.spec.ts tests/e2e/invoices.spec.ts tests/e2e/jobs.spec.ts`

### Task 3A.2: Inventory Drawer/Form Responsive Fixes
- **Location**: `src/pages/Inventory/AddProductDrawer.tsx`, `src/pages/Inventory/ImportInventoryDrawer.tsx`, `src/pages/Inventory/ProductDetailDrawer.tsx`
- **Description**: Replace fixed two-column form layouts with breakpoint-aware layouts that collapse cleanly in narrow drawers.
- **Dependencies**: Task 3A.1
- **Acceptance Criteria**:
  - Core form actions remain visible at sidecar `340/420`.
  - No clipped labels/inputs or overlapping action rows.
- **Validation**:
  - `npm run test:e2e -- tests/e2e/inventory.spec.ts tests/e2e/sidecar-flow.spec.ts`

### Task 3A.3: Update Baseline Defect Statuses For Table/Form Issues
- **Location**: `docs/planning/ux-ui-responsive-audit-baseline.md`
- **Description**: Move RWD-002/RWD-003/RWD-004/RWD-005 to `Done` or `In Review` with viewport evidence and notes.
- **Dependencies**: Task 3A.1, Task 3A.2
- **Acceptance Criteria**:
  - Each defect entry includes verified viewport coverage.
  - Any residual issues are split into new IDs with explicit owners.
- **Validation**:
  - Manual review of defect log completeness.

## Sprint 3B: Evaluator + Research Flow Adaptation
**Goal**: Keep analysis workflows readable and operable at smaller widths without control overlap.  
**Demo/Validation**:
- Demo `/evaluate` and `/market-research` at `360`, `768`, `1024`, plus sidecar `340/420`.
- Confirm input -> loading -> results flow remains clear and stable.

### Task 3B.1: Unified Evaluator Form/Result Stacking Cleanup
- **Location**: `src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx`, `src/pages/BuyBox/EvaluatorView.tsx`
- **Description**: Ensure responsive stacking rules for controls and result cards prevent overlap and preserve primary CTA visibility.
- **Dependencies**: Task 3A.1
- **Acceptance Criteria**:
  - No control overlap at `360` and `768`.
  - Primary action controls remain on-screen without zoom.
- **Validation**:
  - `npm run test:e2e -- tests/e2e/evaluator.spec.ts`

### Task 3B.2: Market Research Panel Height + Media Preview Constraints
- **Location**: `src/pages/MarketResearch/MarketResearchView.tsx`, `src/pages/MarketResearch/MarketResearchResultPanel.tsx`, `src/components/feedback/LiveResultPreview.tsx`
- **Description**: Constrain preview/media panel behavior to avoid vertical collapse and clipping on medium-small viewports.
- **Dependencies**: Task 3B.1
- **Acceptance Criteria**:
  - Result/preview cards stay readable and scrollable.
  - No clipped preview media or hidden metadata rows.
- **Validation**:
  - `npm run test:e2e -- tests/e2e/market-research.spec.ts`

### Task 3B.3: Sidecar Quick Check Density Tuning
- **Location**: `src/components/sidecar/QuickCheck.tsx`
- **Description**: Reduce compact-width density and adjust chip/input wrapping to improve scanability at `340`.
- **Dependencies**: Task 3B.1
- **Acceptance Criteria**:
  - No action truncation in quick-check controls.
  - Readability improves at `340` without losing key actions.
- **Validation**:
  - `npm run test:e2e -- tests/e2e/sidecar-flow.spec.ts tests/e2e/evaluator.spec.ts`

## Sprint 3C: Secondary Surface Consistency + Accessibility Guardrails
**Goal**: Close Sprint 3 with consistent states and baseline accessibility protections.  
**Demo/Validation**:
- Demo keyboard-only path through dashboard, sourcing, retail-price, and modal/drawer interactions.
- Demo reduced-motion behavior on route transitions and overlays.

### Task 3C.1: Secondary Page State Consistency Pass
- **Location**: `src/pages/Dashboard/DashboardView.tsx`, `src/pages/Sourcing/SourcingView.tsx`, `src/pages/SavedResearch/SavedResearchView.tsx`, `src/pages/SerialCheck/SerialCheckView.tsx`, `src/pages/RetailPrice/RetailPriceView.tsx`
- **Description**: Align empty/loading/error state layout and spacing patterns to remove one-off responsive behavior.
- **Dependencies**: Task 3B.2
- **Acceptance Criteria**:
  - State components feel structurally consistent across listed pages.
  - No viewport-specific state layout breakage in `360/768/1024/1440`.
- **Validation**:
  - `npm run test:e2e -- tests/e2e/dashboard-shell.spec.ts tests/e2e/sourcing.spec.ts tests/e2e/retail-price.spec.ts`

### Task 3C.2: Reduced-Motion + Overlay Keyboard Hardening
- **Location**: `src/components/layout/PageTransition.tsx`, `src/components/layout/AnimatedRoutes.tsx`, `src/styles/index.css`, `src/components/design-system/Modal.tsx`, `src/components/design-system/Drawer.tsx`
- **Description**: Enforce reduced-motion-safe transitions and verify focus trap/escape behavior in modal and drawer primitives.
- **Dependencies**: Task 3C.1
- **Acceptance Criteria**:
  - `prefers-reduced-motion` disables non-essential transitions.
  - Focus remains trapped correctly and escape exits overlays reliably.
- **Validation**:
  - `npm run test:e2e -- tests/e2e/responsive-shell.spec.ts tests/e2e/dashboard-shell.spec.ts`
  - Manual keyboard + reduced-motion pass.

### Task 3C.3: Sprint 3 Exit Documentation Update
- **Location**: `docs/planning/ux-ui-responsive-audit-baseline.md`, `docs/planning/ux-ui-release-checklist.md`, `.planning/STATE.md`
- **Description**: Record Sprint 3 completion evidence, unresolved issues, and handoff notes for Sprint 4.
- **Dependencies**: Task 3C.2
- **Acceptance Criteria**:
  - Sprint 3 evidence is discoverable and linked to test runs.
  - Remaining issues are explicitly deferred to Sprint 4 with owners.
- **Validation**:
  - Manual documentation consistency check.

## Testing Strategy
- Run focused e2e checks after each task group (3A, 3B, 3C) to isolate regressions.
- Run `npm run typecheck` at least once per Sprint 3 wave completion.
- Defer full matrix (`npm run test` and full `npm run test:e2e`) to Sprint 5 unless a regression indicates broader impact.

## Potential Risks & Gotchas
- Table containment fixes can silently hide controls; verify sticky/action columns in both keyboard and pointer flows.
- Responsive adjustments to evaluator/research panels can regress sidecar density if shared classes are reused.
- Motion reductions can accidentally remove useful context transitions; keep transition removal targeted, not global.
- Secondary page consistency work can drift into visual redesign; keep scope to structure/spacing/state parity.

## Rollback Plan
- Land changes in small commits per task (`3A.1`, `3A.2`, etc.) for safe reverts.
- If a page regression appears, rollback only the affected task commit and retain validated tasks.
- Keep Sprint 3 docs updated as each task lands to avoid losing evidence during partial rollback.
