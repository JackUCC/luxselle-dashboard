# UX/UI Release Checklist

**Date**: 2026-03-02  
**Applies To**: Overview mode + Sidecar mode  
**Blocking Rule**: Any open `P0` or `P1` issue blocks release.

## 1) Responsive Checklist

### Overview Mode
- [ ] `360 x 900`: no page-level horizontal overflow on `/`, `/evaluate`, `/inventory`, `/invoices`.
- [ ] `768 x 1024`: table/list views remain usable on `/inventory`, `/jobs`, `/invoices`.
- [ ] `1024 x 768`: no clipped primary actions in page headers or drawers.
- [ ] `1440 x 900`: dock navigation, spacing, and card layout render without overlap.

### Sidecar Mode (Quarter-Screen Priority)
- [ ] `340 x 900`: sidecar nav, quick check, inventory, and invoices are operable with no blocked actions.
- [ ] `420 x 900`: sidecar workflows remain scannable (no clipped CTA labels).
- [ ] `480 x 900`: sidecar tables/forms fit without page-level overflow.
- [ ] `640 x 900`: sidecar continues to preserve compact layout intent.
- [ ] `320 x 900`: graceful degradation only; core actions still reachable.

### Mode Continuity
- [ ] Navigation from `/evaluate?mode=sidecar` to `/inventory` and `/invoices` preserves `mode=sidecar`.
- [ ] Exiting sidecar returns to overview route without lingering `mode` query param.

## 2) Accessibility Checklist

### Keyboard
- [ ] All primary workflows are operable with keyboard only.
- [ ] Focus order is logical in nav, forms, drawers, and modals.
- [ ] Escape closes mobile drawer and modal/drawer overlays.

### Focus Visibility And Targets
- [ ] All interactive controls expose visible focus ring.
- [ ] Touch/click targets are at least `44px` high for core actions.
- [ ] No focus trap leaks in modal and drawer components.

### Motion And Status
- [ ] Reduced-motion preference is respected for route/overlay transitions.
- [ ] Error, loading, and success states are perceivable and not animation-dependent.

## 3) Visual Consistency Checklist

- [ ] Color, spacing, and typography use existing design tokens (`tailwind.config.js`, `src/styles/index.css`).
- [ ] Empty, loading, and error states follow shared patterns across all major pages.
- [ ] Card/table/filter controls use consistent interaction states (hover, active, focus, disabled).

## 4) Test Evidence Checklist

- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run test:e2e -- tests/e2e/responsive-shell.spec.ts`
- [ ] `npm run test:e2e -- tests/e2e/dashboard-shell.spec.ts tests/e2e/sidecar-flow.spec.ts`
- [ ] `npm run test:e2e -- tests/e2e/inventory.spec.ts tests/e2e/invoices.spec.ts tests/e2e/evaluator.spec.ts`

## 5) Sign-Off

| Gate | Owner | Result | Notes |
|---|---|---|---|
| Responsive | Frontend | Pending |  |
| Accessibility | Frontend | Pending |  |
| Visual Consistency | Frontend | Pending |  |
| Automated Test Evidence | QA | Pending |  |
| Release Approval | Product | Pending |  |

