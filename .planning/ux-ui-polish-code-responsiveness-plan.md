# Plan: UX/UI Polish Completion + Code Quality + Responsiveness Hardening

**Generated**: 2026-03-02  
**Estimated Complexity**: High

## Locked Decisions
- Keep backend reliability/performance tasks inside this same plan (Sprint 4), since they directly affect UX quality (latency + data integrity).
- Prioritize sidecar responsiveness for quarter-screen usage on laptop/monitor setups:
  - Primary sidecar target widths: `340`, `420`, `480`, `640`.
  - Safety floor: `320` (graceful degradation only).
- Dependency strategy: allow minimal, high-ROI additions only.
  - Runtime dependencies: avoid unless absolutely required.
  - Dev/test dependencies: allowed when they materially improve regression detection (for example automated accessibility checks).

## Overview
UI polish milestone work is complete, but there are still practical gaps in responsive behavior (especially data-dense pages), consistency, and maintainability.  
This plan focuses on shipping a production-ready UX pass with explicit responsive validation, accessibility hardening, and codebase cleanup that reduces regression risk.

## Prerequisites
- Local stack boots successfully (`npm run dev`).
- Seed data available for realistic page states (`npm run seed`).
- Playwright browser installed (`npm run e2e:install-browser`).
- Existing UI constraints remain: keep design tokens consistent with `tailwind.config.js` and `src/styles/index.css`.
- Optional dev dependency (only if needed in Sprint 3/4): `@axe-core/playwright`.

## Sprint 1: Baseline And Scope Lock
**Goal**: Establish a measurable baseline and prioritized UX/responsiveness backlog before implementation.  
**Demo/Validation**:
- Run current app across overview widths `360`, `768`, `1024`, `1440` and sidecar widths `340`, `420`, `480`, `640` (plus `320` safety floor) and capture defects.
- Produce a ranked backlog and acceptance matrix per page.

### Task 1.1: Create Responsive + UX Audit Matrix
- **Location**: `docs/planning/ux-ui-responsive-audit-baseline.md`
- **Description**: Document page-by-page defects (overflow, clipped actions, typography scale, interaction density, keyboard flow, loading/empty/error states).
- **Dependencies**: None
- **Acceptance Criteria**:
  - Audit includes all routes from `src/components/layout/AnimatedRoutes.tsx`.
  - Issues are tagged by severity (`P0/P1/P2`) and viewport.
  - Each issue has owner file targets.
  - Sidecar defects are explicitly tagged by quarter-screen width buckets (`340/420/480/640`).
- **Validation**:
  - Manual walkthrough in all target viewport widths.
  - Cross-check issue count against all primary page routes.

### Task 1.2: Add Playwright Responsive Smoke Spec
- **Location**: `tests/e2e/responsive-shell.spec.ts`, `config/playwright.config.cjs`
- **Description**: Add a small responsive smoke suite for shell/navigation invariants (mobile drawer, side rail, breadcrumb, sidecar mode, table overflow containment).
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Spec runs in at least mobile + desktop projects.
  - Fails when key shell elements overflow/vanish at target widths.
- **Validation**:
  - `npm run test:e2e -- tests/e2e/responsive-shell.spec.ts`

### Task 1.3: Define Final UX Acceptance Checklist
- **Location**: `docs/planning/ux-ui-release-checklist.md`
- **Description**: Convert backlog into a release checklist with pass/fail criteria for responsiveness, accessibility, and visual consistency.
- **Dependencies**: Task 1.1
- **Acceptance Criteria**:
  - Checklist covers all pages and both modes (overview + sidecar).
  - Includes keyboard-only pass and reduced-motion pass.
- **Validation**:
  - Checklist reviewed against route inventory and existing e2e specs.

## Sprint 2: Shell, Navigation, And Sidecar Hardening
**Goal**: Make global layout and nav behavior reliable across breakpoints and interaction modes.  
**Demo/Validation**:
- Demo smooth route navigation at mobile/tablet/desktop and sidecar widths.
- Confirm no clipped nav labels, hidden controls, or off-screen drawer content.

### Task 2.1: Normalize Global Layout Breakpoints
- **Location**: `src/LuxselleApp.tsx`, `src/styles/index.css`, `tailwind.config.js`
- **Description**: Standardize container paddings, sticky header behavior, and responsive spacing scale across breakpoints.
- **Dependencies**: Task 1.3
- **Acceptance Criteria**:
  - Main content spacing is consistent across pages.
  - No horizontal scrolling on shell-level containers in overview mode.
- **Validation**:
  - Visual check on all target widths.
  - `npm run test:e2e -- tests/e2e/dashboard-shell.spec.ts tests/e2e/responsive-shell.spec.ts`

### Task 2.2: Harden Navigation Components For Touch + Keyboard
- **Location**: `src/components/navigation/DockBar.tsx`, `src/components/navigation/MobileNavDrawer.tsx`, `src/components/navigation/WideScreenSideRail.tsx`, `src/components/navigation/SidecarNav.tsx`
- **Description**: Ensure consistent hit targets, focus order, focus rings, and route-change behavior for all nav surfaces.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Keyboard traversal is predictable and complete.
  - Touch hit targets are >= 44px for actionable controls.
  - Drawer open/close and escape behavior is stable.
- **Validation**:
  - Keyboard-only walkthrough.
  - `npm run test:e2e -- tests/e2e/dashboard-shell.spec.ts tests/e2e/sidecar-flow.spec.ts`

### Task 2.3: Sidecar Overflow And Density Pass
- **Location**: `src/components/sidecar/SidecarView.tsx`, `src/components/sidecar/QuickCheck.tsx`, `src/components/sidecar/SidecarWidgets.tsx`, `src/components/sidecar/BatchProcessor.tsx`
- **Description**: Fix compact-width clipping, overflow behavior, and panel density for sustained use in narrow sidecar mode.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - No horizontal clipping in primary sidecar widths `340-640px`.
  - `320px` remains usable without blocked actions (graceful degradation).
  - Tooling remains scannable without hidden actions.
- **Validation**:
  - Manual sidecar walkthrough on narrow widths.
  - `npm run test:e2e -- tests/e2e/sidecar-flow.spec.ts`

## Sprint 3: Page-Level Responsive + Accessibility Sweep
**Goal**: Resolve high-impact responsive and accessibility issues on data-heavy and high-frequency workflows.  
**Demo/Validation**:
- Demo top workflows end-to-end at mobile + desktop without layout breaks.
- Verify keyboard flow and status messaging clarity.

### Task 3.1: Data Table Responsiveness Stabilization
- **Location**: `src/pages/Inventory/InventoryView.tsx`, `src/pages/Invoices/InvoicesView.tsx`, `src/pages/Jobs/JobsView.tsx`
- **Description**: Standardize table wrappers, sticky headers where useful, and constrained cell behavior to avoid truncation/overflow regressions.
- **Dependencies**: Task 2.2
- **Acceptance Criteria**:
  - Table views remain usable at tablet and small desktop.
  - Horizontal overflow is intentional and contained with clear affordance.
- **Validation**:
  - `npm run test:e2e -- tests/e2e/inventory.spec.ts tests/e2e/invoices.spec.ts tests/e2e/jobs.spec.ts`

### Task 3.2: Evaluator + Research Layout Adaptation
- **Location**: `src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx`, `src/pages/MarketResearch/MarketResearchView.tsx`, `src/pages/BuyBox/EvaluatorView.tsx`, `src/components/feedback/LiveResultPreview.tsx`
- **Description**: Improve form/result panel stacking, card heights, and media preview behavior at smaller widths.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - No overlapping controls in analysis flows.
  - AI progress and result content stays readable without zooming.
- **Validation**:
  - `npm run test:e2e -- tests/e2e/evaluator.spec.ts tests/e2e/market-research.spec.ts`

### Task 3.3: Secondary Pages Consistency Pass
- **Location**: `src/pages/Dashboard/DashboardView.tsx`, `src/pages/Sourcing/SourcingView.tsx`, `src/pages/SavedResearch/SavedResearchView.tsx`, `src/pages/SerialCheck/SerialCheckView.tsx`, `src/pages/RetailPrice/RetailPriceView.tsx`
- **Description**: Align empty/loading/error states, tighten spacing consistency, and remove responsive one-offs that conflict with design tokens.
- **Dependencies**: Task 2.1
- **Acceptance Criteria**:
  - Empty and loading states are visually consistent across pages.
  - Card grids break cleanly at all target widths.
- **Validation**:
  - `npm run test:e2e -- tests/e2e/dashboard-shell.spec.ts tests/e2e/sourcing.spec.ts tests/e2e/retail-price.spec.ts`

### Task 3.4: Accessibility And Motion Guardrails
- **Location**: `src/components/layout/PageTransition.tsx`, `src/components/layout/AnimatedRoutes.tsx`, `src/styles/index.css`, `src/components/design-system/Modal.tsx`, `src/components/design-system/Drawer.tsx`
- **Description**: Respect reduced-motion preferences, verify focus trapping for overlays, and ensure critical status text is perceivable.
- **Dependencies**: Task 3.1, Task 3.2
- **Acceptance Criteria**:
  - Reduced-motion mode avoids aggressive motion while preserving clarity.
  - Modal/drawer keyboard behavior is consistent and reversible.
- **Validation**:
  - Manual reduced-motion and keyboard test pass.
  - `npm run test:e2e -- tests/e2e/responsive-shell.spec.ts`

## Sprint 4: Code Quality And Maintainability
**Goal**: Reduce complexity and duplication so UX polish is sustainable and easier to extend.  
**Demo/Validation**:
- Demo unchanged user behavior with cleaner code structure.
- Show reduced duplication in styling/interaction patterns.

### Task 4.1: Extract Reusable UI Primitives For Repeated Patterns
- **Location**: `src/components/design-system/`, `src/pages/Inventory/InventoryView.tsx`, `src/pages/Invoices/InvoicesView.tsx`, `src/pages/Jobs/JobsView.tsx`
- **Description**: Extract repeated icon-button, filter-chip row, and table-shell patterns into shared design-system primitives.
- **Dependencies**: Task 3.1
- **Acceptance Criteria**:
  - Repeated class-heavy blocks replaced by shared components.
  - New primitives documented through clear prop names and usage.
- **Validation**:
  - `npm run typecheck`
  - Regression run for touched page specs.

### Task 4.2: Split Oversized Page Components
- **Location**: `src/pages/Inventory/InventoryView.tsx`, `src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx`, `src/pages/MarketResearch/MarketResearchView.tsx`
- **Description**: Break large pages into local subcomponents/hooks for better readability and safer edits.
- **Dependencies**: Task 4.1
- **Acceptance Criteria**:
  - Page files reduced in complexity and grouped by concern.
  - Behavior remains equivalent in existing workflows.
- **Validation**:
  - `npm run typecheck`
  - `npm run test:e2e -- tests/e2e/inventory.spec.ts tests/e2e/evaluator.spec.ts tests/e2e/market-research.spec.ts`

### Task 4.3: Strengthen Frontend Regression Coverage
- **Location**: `tests/e2e/`, `config/playwright.config.cjs`
- **Description**: Expand e2e assertions for responsive and accessibility regressions on highest-risk flows.
- **Dependencies**: Task 3.4
- **Acceptance Criteria**:
  - New checks cover at least: nav shell, sidecar flow, inventory table, invoices table, evaluator panel transitions.
  - Failures clearly point to UI regression class.
- **Validation**:
  - `npm run test:e2e -- tests/e2e/responsive-shell.spec.ts tests/e2e/dashboard-shell.spec.ts tests/e2e/inventory.spec.ts tests/e2e/evaluator.spec.ts tests/e2e/invoices.spec.ts tests/e2e/sidecar-flow.spec.ts`

### Task 4.4: Protect Critical Multi-Write Backend Flows
- **Location**: `packages/server/src/routes/products.ts`, `packages/server/src/repos/InvoiceRepo.ts`, `packages/server/src/routes/products.test.ts`
- **Description**: Refactor `transactions` and `sell-with-invoice` write paths to use Firestore transaction/batch semantics to avoid partial writes.
- **Dependencies**: Task 4.2
- **Acceptance Criteria**:
  - No partial commit state when one write in the chain fails.
  - Existing route behavior and response shape stay stable for UI clients.
- **Validation**:
  - `npm run test -- packages/server/src/routes/products.test.ts`

### Task 4.5: Reduce UI-Visible API Latency Hotspots
- **Location**: `packages/server/src/routes/dashboard.ts`, `packages/server/src/services/import/SupplierEmailSyncService.ts`, `packages/server/src/repos/BaseRepo.ts`
- **Description**: Replace unbounded list scans on high-traffic endpoints with bounded queries/limits for dashboard and status endpoints first.
- **Dependencies**: Task 4.4
- **Acceptance Criteria**:
  - Dashboard/status endpoints no longer load full collections by default.
  - Response shape remains backward compatible for frontend pages.
- **Validation**:
  - `npm run test -- packages/server/src/routes/dashboard.test.ts packages/server/src/routes/suppliers.test.ts`
  - Manual page load timing spot-check in Dashboard and Sourcing pages.

## Sprint 5: Final QA, Docs, And Release Readiness
**Goal**: Close the plan with objective evidence and rollout guidance.  
**Demo/Validation**:
- End-to-end walkthrough succeeds with no P0/P1 open items.
- QA evidence and docs are updated for handoff.

### Task 5.1: Full Validation Pass
- **Location**: `tests/e2e/*.spec.ts`, `config/vitest.config.ts`
- **Description**: Run typecheck, unit tests, and targeted/full e2e suites; capture pass/fail outcomes and triage residual issues.
- **Dependencies**: Sprint 4 complete
- **Acceptance Criteria**:
  - Core command set passes or failures are documented with severity and owner.
  - No unresolved P0 defects.
- **Validation**:
  - `npm run typecheck`
  - `npm run test`
  - `npm run test:e2e`

### Task 5.2: Update Planning And Handoff Docs
- **Location**: `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `docs/planning/STATUS_AND_PLAN.md`
- **Description**: Record completion state, residual risks, and next milestone entry points.
- **Dependencies**: Task 5.1
- **Acceptance Criteria**:
  - Planning docs reflect final status and remaining backlog.
  - Next-step recommendation is explicit and prioritized.
- **Validation**:
  - Manual doc consistency check across status/roadmap/requirements.

## Testing Strategy
- Keep existing test gates as non-negotiable: `typecheck`, `vitest`, and Playwright.
- Add responsive smoke checks early (Sprint 1) so regressions fail fast.
- Validate each sprint with a limited, relevant e2e subset before running full matrix.
- Include manual keyboard + reduced-motion checks in Sprints 2-3 because they are not fully covered by current automation.
- For backend reliability/performance tasks, require route-level tests before and after refactors to prove API compatibility.

## Potential Risks & Gotchas
- Large page refactors can introduce subtle state regressions; mitigate by splitting only after responsive fixes stabilize.
- New responsive rules can break sidecar behavior unexpectedly; always validate `?mode=sidecar` after shell/page changes.
- Visual consistency work can drift from design tokens; enforce token-only colors/spacing and avoid ad-hoc utility overrides.
- E2E runtime may increase as responsive checks grow; keep smoke suite lean and reserve full matrix for Sprint 5.

## Rollback Plan
- Keep each task committable and isolate by feature area (shell, sidecar, page, test).
- If a responsive fix regresses core workflow behavior, revert the specific task commit and keep unaffected sprints merged.
- Maintain a stable branch/tag before Sprint 4 refactors; only proceed to Sprint 5 after this checkpoint is green.
