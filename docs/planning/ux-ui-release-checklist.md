# UX/UI Release Checklist

**Date**: 2026-03-02  
**Applies To**: Overview mode + Sidecar mode  
**Blocking Rule**: Any open `P0` or `P1` issue blocks release.

## 1) Responsive Checklist

### Overview Mode
- [x] `360 x 900`: no page-level horizontal overflow on `/`, `/evaluate`, `/inventory`, `/invoices`.
- [x] `768 x 1024`: table/list views remain usable on `/inventory`, `/jobs`, `/invoices`.
- [x] `1024 x 768`: no clipped primary actions in page headers or drawers.
- [x] `1440 x 900`: dock navigation, spacing, and card layout render without overlap.

### Sidecar Mode (Quarter-Screen Priority)
- [x] `340 x 900`: sidecar nav, quick check, inventory, and invoices are operable with no blocked actions.
- [x] `420 x 900`: sidecar workflows remain scannable (no clipped CTA labels).
- [x] `480 x 900`: sidecar tables/forms fit without page-level overflow.
- [x] `640 x 900`: sidecar continues to preserve compact layout intent.
- [x] `320 x 900`: graceful degradation only; core actions still reachable.

### Mode Continuity
- [x] Navigation from `/evaluate?mode=sidecar` to `/inventory` and `/invoices` preserves `mode=sidecar`.
- [x] Exiting sidecar returns to overview route without lingering `mode` query param.

## 2) Accessibility Checklist

### Keyboard
- [x] All primary workflows are operable with keyboard only.
- [x] Focus order is logical in nav, forms, drawers, and modals.
- [x] Escape closes mobile drawer and modal/drawer overlays.

### Focus Visibility And Targets
- [x] All interactive controls expose visible focus ring.
- [x] Touch/click targets are at least `44px` high for core actions.
- [x] No focus trap leaks in modal and drawer components.

### Motion And Status
- [x] Reduced-motion preference is respected for route/overlay transitions.
- [x] Error, loading, and success states are perceivable and not animation-dependent.

## 3) Visual Consistency Checklist

- [x] Color, spacing, and typography use existing design tokens (`tailwind.config.js`, `src/styles/index.css`).
- [x] Empty, loading, and error states follow shared patterns across all major pages.
- [x] Card/table/filter controls use consistent interaction states (hover, active, focus, disabled).

## 4) Test Evidence Checklist

- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run test:e2e -- tests/e2e/responsive-shell.spec.ts`
- [x] `npm run test:e2e -- tests/e2e/dashboard-shell.spec.ts tests/e2e/sidecar-flow.spec.ts`
- [x] `npm run test:e2e -- tests/e2e/inventory.spec.ts tests/e2e/invoices.spec.ts tests/e2e/evaluator.spec.ts`
- [x] `npm run test:e2e -- tests/e2e/market-research.spec.ts tests/e2e/sourcing.spec.ts tests/e2e/retail-price.spec.ts`
- [x] `npm run test:e2e -- tests/e2e/saved-research.spec.ts tests/e2e/retail-price.spec.ts`

## 5) Sign-Off

| Gate | Owner | Result | Notes |
|---|---|---|---|
| Responsive | Frontend | Pass | Responsive shell + route suites pass; no blocking overflow regressions observed. |
| Accessibility | Frontend | Pass | Keyboard/focus/target checks addressed in shared and page-level controls; no blocking issues in sweep scope. |
| Visual Consistency | Frontend | Pass | Sprint 3 secondary-page consistency sweep completed across Dashboard/Sourcing/SavedResearch/SerialCheck/RetailPrice (+ active serial panel in `/evaluate`). |
| Automated Test Evidence | QA | Pass | Typecheck + targeted e2e evidence captured in Sprint 3 docs. |
| Release Approval | Product | Pass | Sprint 3 closure accepted; move to Sprint 4 (code quality + maintainability) next. |
