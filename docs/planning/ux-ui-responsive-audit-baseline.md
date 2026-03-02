# UX/UI Responsive Audit Baseline

**Date**: 2026-03-02  
**Status**: Sprint 1 Baseline  
**Scope**: Overview mode + Sidecar mode (`?mode=sidecar`)

## Objective
Establish a measurable baseline for responsiveness, accessibility, and layout consistency before implementation sprints.

## Viewport Matrix

| Context | Width x Height | Priority |
|---|---|---|
| Overview mobile | `360 x 900` | High |
| Overview tablet | `768 x 1024` | High |
| Overview small laptop | `1024 x 768` | High |
| Overview desktop | `1440 x 900` | High |
| Sidecar quarter-screen (small) | `340 x 900` | Critical |
| Sidecar quarter-screen (standard) | `420 x 900` | Critical |
| Sidecar quarter-screen (comfortable) | `480 x 900` | High |
| Sidecar quarter-screen (wide) | `640 x 900` | High |
| Sidecar safety floor | `320 x 900` | Medium |

## Route Coverage Matrix

| Route | Modes | Primary Files |
|---|---|---|
| `/` | Overview, Sidecar entry | `src/pages/Dashboard/DashboardView.tsx`, `src/components/sidecar/SidecarView.tsx` |
| `/evaluate` | Overview, Sidecar | `src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx`, `src/components/sidecar/SidecarView.tsx` |
| `/inventory` | Overview, Sidecar | `src/pages/Inventory/InventoryView.tsx`, `src/pages/Inventory/ProductDetailDrawer.tsx` |
| `/invoices` | Overview, Sidecar | `src/pages/Invoices/InvoicesView.tsx` |
| `/jobs` | Overview | `src/pages/Jobs/JobsView.tsx` |
| `/sourcing` | Overview | `src/pages/Sourcing/SourcingView.tsx` |
| `/market-research` | Overview | `src/pages/MarketResearch/MarketResearchView.tsx` |
| `/saved-research` | Overview | `src/pages/SavedResearch/SavedResearchView.tsx` |
| `/retail-price` | Overview | `src/pages/RetailPrice/RetailPriceView.tsx` |

## Baseline Defect Backlog

| ID | Severity | Viewport Bucket | Route/Surface | Finding | Owner Targets | Status |
|---|---|---|---|---|---|---|
| RWD-001 | P1 | Sidecar `340/420` | Sidecar top nav | Menu trigger in sidecar nav uses `34px` hit-target sizing; below `44px` accessibility target. | `src/components/navigation/SidecarNav.tsx` | Open |
| RWD-002 | P1 | Sidecar `340/420` | Invoices table | Invoice line-items table uses `min-w-[520px]`; horizontal scroll is expected, but scroll affordance and containment need validation. | `src/pages/Invoices/InvoicesView.tsx` | Open |
| RWD-003 | P1 | Overview `768`, Sidecar `420` | Jobs table | Dense table columns and detail panels risk clipping/truncation at narrow widths. | `src/pages/Jobs/JobsView.tsx` | Open |
| RWD-004 | P1 | Sidecar `340/420` | Inventory table/grid | Table mode requires strict overflow containment and action visibility in quarter-screen layout. | `src/pages/Inventory/InventoryView.tsx` | Open |
| RWD-005 | P1 | Sidecar `340/420` | Inventory forms | Multiple forms use fixed `grid-cols-2` patterns that may crowd at narrow drawer widths. | `src/pages/Inventory/AddProductDrawer.tsx`, `src/pages/Inventory/ImportInventoryDrawer.tsx`, `src/pages/Inventory/ProductDetailDrawer.tsx` | Open |
| RWD-006 | P2 | Sidecar `340` | QuickCheck | Compact input groups use fixed minimum widths and multi-column chip grids that can reduce scanability at small quarter-screen sizes. | `src/components/sidecar/QuickCheck.tsx` | Open |
| RWD-007 | P1 | All | Motion/accessibility | Transition system needs explicit reduced-motion behavior checks for route and overlay transitions. | `src/components/layout/PageTransition.tsx`, `src/components/layout/AnimatedRoutes.tsx`, `src/styles/index.css` | Open |
| RWD-008 | P1 | All | QA automation | No dedicated responsive regression smoke spec existed for shell/sidecar/table containment before Sprint 1. | `tests/e2e/responsive-shell.spec.ts` | In Progress |

## Verification Workflow (Sprint 1)

1. Run responsive smoke spec:
   - `npm run test:e2e -- tests/e2e/responsive-shell.spec.ts`
2. Run existing shell + sidecar regressions:
   - `npm run test:e2e -- tests/e2e/dashboard-shell.spec.ts tests/e2e/sidecar-flow.spec.ts`
3. Record defects with viewport + route + owner mapping in the backlog table above.

## Defect Log Template

| ID | Severity | Viewport | Route | Repro Steps | Expected | Actual | Owner File(s) | Status |
|---|---|---|---|---|---|---|---|---|
| RWD-XXX | P0/P1/P2 | `340x900` | `/inventory?mode=sidecar` | ... | ... | ... | ... | Open/In Progress/Done |

