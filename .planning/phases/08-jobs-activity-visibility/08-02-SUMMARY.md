---
phase: 08-jobs-activity-visibility
plan: 02
status: complete
---

## What was done
Wired JobsView into the app routing and surfaced the activity feed on the Dashboard.

- `src/components/layout/routeMeta.ts`: Added `Briefcase` to lucide-react imports. Added `{ path: '/jobs', label: 'Jobs', navLabel: 'Jobs', icon: Briefcase, section: 'manage' }` as last entry in `appRoutes[]`. DockBar and MobileNavDrawer automatically pick up the new route.

- `src/components/layout/AnimatedRoutes.tsx`: Added `const JobsView = lazy(() => import('../../pages/Jobs/JobsView'))`. Added `{ path: '/jobs', element: <JobsView /> }` to the routes array before the `/evaluator` redirect.

- `src/pages/Dashboard/DashboardView.tsx`: Added `import type { ActivityEvent } from '@luxselle/shared'`. Added `activities` state. Extended `Promise.all` to fetch `/dashboard/activity?limit=10`. Added `SectionLabel` to design-system import. Added a `data-testid="activity-feed"` section after Row 4 BentoGrid, guarded by `activities.length > 0`.

## Outcome
`npm run typecheck` exits 0 with no errors.
