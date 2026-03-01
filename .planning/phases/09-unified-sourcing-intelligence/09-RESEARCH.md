# Phase 9: Unified Sourcing Intelligence - Research

**Researched:** 2026-03-01  
**Domain:** Unified evaluator UX, route migration, sidecar parity, nav cleanup  
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INTEL-01 | Unified Sourcing Intelligence page combines price, serial, and landed-cost in one description-first flow | Existing `EvaluatorView`, `SerialCheckView`, `LandedCostWidget`, and `QuickCheck` already provide most logic; phase work is primarily composition + route migration |
| UX-01 | Design consistency pass (cards, spacing, loading/empty states) | Existing design-system primitives (`PageHeader`, `SectionLabel`, `Button`, `Card`) are already used across pages; phase work is consistency alignment and gaps cleanup |
| UX-02 | Sidebar visual cleanup (icons, spacing, grouping) | Navigation is fully metadata-driven via `routeMeta.ts` + `NAV_GROUPS`; cleanup can be done centrally without route component rewrites |
</phase_requirements>

---

## Summary

The current app has complete but separate decision tools:

- `/buy-box` (Price Check + comparables + max buy/bid + image tooling)
- `/serial-check` (serial decode + age-adjusted guidance)
- landed-cost widgets/calculator spread across evaluator, dashboard, and sidecar

Phase 9 can be delivered without backend API changes by composing existing logic into one route:

- Create a new unified route (`/evaluate`) as the primary "description-first" decision page.
- Redirect `/buy-box`, `/serial-check`, and `/evaluator` to `/evaluate` while preserving query params.
- Keep sidecar behavior through `useLayoutMode()` and `SidecarView`.
- Keep legacy files intact while moving user entry points to the new unified flow.

---

## Verified Architecture Patterns

### Pattern 1: Metadata-driven navigation

`appRoutes` in `src/components/layout/routeMeta.ts` feeds:

- `DockBar.tsx`
- `MobileNavDrawer.tsx`
- `SidecarNav.tsx`
- Mobile page title in `LuxselleApp.tsx` via `getRouteMeta(pathname)`

This means route/nav cleanup should happen in `routeMeta.ts` first.

### Pattern 2: Route registration and redirects

`AnimatedRoutes.tsx` defines lazy imports and route mappings. Redirects currently exist (`/evaluator` -> `/buy-box`), so preserving legacy URLs is established behavior.

### Pattern 3: Sidecar mode behavior

`EvaluatorView` already guards on `isSidecar` and renders `SidecarView`. The unified page should keep this behavior to avoid regressions in sidecar tests and workflows.

### Pattern 4: Session-backed research state

Price and serial workflows can persist state using `useResearchSession` keys (`buy-box`, `serial-check`) and do not need new persistence infrastructure.

---

## Route Migration Strategy

Target route model:

- `/evaluate` -> unified sourcing intelligence page
- `/buy-box` -> redirect to `/evaluate` (preserve search params)
- `/serial-check` -> redirect to `/evaluate` (preserve search params)
- `/evaluator` -> redirect to `/evaluate` (preserve search params)

Benefits:

- Existing links keep working.
- New nav can be decluttered to one core decision route.
- Market Intelligence widget can directly route to `/evaluate?q=...&run=1`.

---

## Known Gaps to Close in Phase

1. **Landed-cost prefill mismatch:** Sidecar quick check auto-fills bid from `maxBidEur`; overview evaluator does not.
2. **Split decision surface:** Price, serial, and landed cost are fragmented between pages.
3. **Nav clutter in check tools:** Separate Price Check and Serial Check entries no longer match the intended unified flow.
4. **Inconsistent activity empty state:** Dashboard currently renders activity only when events exist.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| New backend endpoint for unified flow | Extra API surface | Existing `/pricing/price-check` and `/ai/serial-decode` |
| New custom nav renderer | Parallel navigation logic | Existing `appRoutes` + `NAV_GROUPS` data model |
| New sidecar architecture | Duplicate sidecar views | Existing `SidecarView` and sidecar widgets |
| New pricing/serial formulas | Reimplemented math | Existing `calculateSerialPricingGuidance`, landed-cost helpers |

---

## Open Questions Resolved for Execution

1. **Should legacy routes be deleted?**  
   No. Keep and redirect for compatibility.

2. **Should serial remain required for the unified flow?**  
   No. Serial remains optional; description-first flow is primary.

3. **Should sidecar use a separate unified UI?**  
   No. Continue rendering `SidecarView` in sidecar mode for parity and compact usability.

---

## Validation Architecture

### Automated checks

- `npm run typecheck`
- `npm test`
- `npm run test:e2e -- evaluator.spec.ts dashboard-shell.spec.ts sidecar-flow.spec.ts`

### Phase validation targets

| Area | Validation |
|------|------------|
| Route migration | Legacy `/buy-box` and `/serial-check` resolve to `/evaluate` |
| Unified flow | Price check + optional serial + landed cost visible in one route |
| Prefill behavior | Landed-cost bid auto-populates from `maxBidEur` in overview |
| Sidecar parity | `/evaluate?mode=sidecar` remains usable and mode-preserving |
| Nav cleanup | One unified evaluate entry in nav; grouping remains clear |

---

## Sources

- `src/pages/BuyBox/EvaluatorView.tsx`
- `src/pages/SerialCheck/SerialCheckView.tsx`
- `src/components/widgets/LandedCostWidget.tsx`
- `src/components/widgets/CalculatorWidget.tsx`
- `src/components/sidecar/QuickCheck.tsx`
- `src/components/layout/AnimatedRoutes.tsx`
- `src/components/layout/routeMeta.ts`
- `src/components/navigation/DockBar.tsx`
- `src/components/navigation/MobileNavDrawer.tsx`
- `src/components/navigation/SidecarNav.tsx`
- `src/lib/routePrefetch.ts`
- `tests/e2e/evaluator.spec.ts`
- `tests/e2e/dashboard-shell.spec.ts`
- `tests/e2e/sidecar-flow.spec.ts`
