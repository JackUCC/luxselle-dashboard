---
phase: 08-jobs-activity-visibility
plan: 01
status: complete
---

## What was done
Added unit tests for two previously untested endpoints:

- `packages/server/src/routes/jobs.test.ts`: Added `mockSet` to the vi.hoisted block, updated SystemJobRepo mock to include `set = mockSet`, fixed `runJob` mock to return a resolved promise (avoids unhandled error from `setImmediate` calling `.catch()` on `undefined`). Added 4 test cases for `POST /api/jobs/:id/retry`: 200 success, 404 not-found, 400 wrong-state, 400 max-retries-exceeded.

- `packages/server/src/routes/dashboard.test.ts`: Added `mockActivityList` to the first vi.hoisted block alongside existing mocks. Upgraded `ActivityEventRepo` mock from a no-op stub to include `list = mockActivityList`. Added 3 test cases for `GET /api/dashboard/activity`: 200 shape, sort-order descending, limit param.

## Outcome
163 tests pass, 0 errors. `npm test` exits 0.
