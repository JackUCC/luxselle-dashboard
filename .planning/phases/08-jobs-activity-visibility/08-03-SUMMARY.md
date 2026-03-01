---
phase: 08-jobs-activity-visibility
plan: 03
status: complete
---

## What was done
Added 3 E2E tests to `tests/e2e/dashboard-shell.spec.ts`:

1. **dock bar navigates to /jobs** — Wide viewport (1720px), clicks Jobs link in dock-bar, asserts URL is `/jobs`.
2. **mobile nav drawer navigates to /jobs** — Narrow viewport (390px), opens mobile-nav-drawer, clicks Jobs link, asserts URL is `/jobs`.
3. **activity feed is visible on dashboard overview** — Mocks all three dashboard API calls (kpis, profit-summary, activity), navigates to `/`, asserts `data-testid="activity-feed"` is visible after skeleton hides.

## Outcome
All 3 new tests pass. Pre-existing failure in `inventory.spec.ts` ("clear filters resets search and URL") is unrelated to this phase and was pre-existing before phase 8.
