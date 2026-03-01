---
phase: 09-unified-sourcing-intelligence
plan: "02"
status: complete
---

## What was done

- Routed `/evaluate` as the primary unified intelligence route in `src/components/layout/AnimatedRoutes.tsx`.
- Added legacy redirects from `/buy-box`, `/serial-check`, and `/evaluator` to `/evaluate` while preserving query params.
- Updated navigation metadata in `src/components/layout/routeMeta.ts` to use one unified check entry (`Evaluate`) instead of separate Price Check + Serial Check entries.
- Updated route prefetch mapping in `src/lib/routePrefetch.ts` for the new route model.
- Updated dashboard market intelligence entry points in `src/components/widgets/MarketIntelligenceWidget.tsx` to navigate directly to `/evaluate` with prefilled query params.
- Added explicit empty state rendering for Dashboard activity in `src/pages/Dashboard/DashboardView.tsx` for consistency.

## Outcome

- Unified route is now the main entry point from navigation and widgets.
- Legacy links continue to function through redirects.
- Dashboard activity section has consistent empty-state behavior.
