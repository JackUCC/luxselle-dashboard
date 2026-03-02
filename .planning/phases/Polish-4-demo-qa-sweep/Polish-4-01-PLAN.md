---
phase: Polish-4-demo-qa-sweep
plan: "01"
type: execute
wave: 1
depends_on:
  - Polish-3-01
files_modified:
  - packages/server/src/routes/products.test.ts
  - packages/server/src/middleware/auth.ts
  - packages/server/src/routes/products.ts
  - scripts/dev-e2e.sh
  - .planning/ROADMAP.md
  - .planning/STATE.md
  - .planning/PROJECT.md
  - .planning/REQUIREMENTS.md
  - .planning/phases/Polish-4-demo-qa-sweep/Polish-4-01-SUMMARY.md
autonomous: true
requirements:
  - QA-01
must_haves:
  truths:
    - "All 11 demo pages render cleanly through happy-path walkthroughs."
    - "No blank panels or route-level crash screens appear during walkthrough."
    - "Unit and targeted e2e suites pass after polish changes."
    - "Any QA harness fixes stay scoped to local/dev behavior and do not alter production auth guarantees."
---

<objective>
Execute Phase Polish-4 by completing a full demo-readiness QA sweep, stabilizing the local e2e harness where needed, and closing QA-01 with test evidence.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Resolve unit-regression blockers discovered during sweep</name>
  <files>packages/server/src/routes/products.test.ts</files>
  <action>Consolidate duplicate auth mocks and align role-resolution behavior so route test assertions reflect current middleware wiring.</action>
  <verify>npm run test -- packages/server/src/routes/products.test.ts</verify>
  <done>Products route tests pass consistently in isolated and full-suite runs.</done>
</task>

<task type="auto">
  <name>Task 2: Stabilize e2e harness for deterministic happy-path setup</name>
  <files>packages/server/src/middleware/auth.ts, packages/server/src/routes/products.ts, scripts/dev-e2e.sh</files>
  <action>Ensure dev/e2e mode accepts intended local setup flows (SKIP_AUTH path and product-create defaults) so Playwright setup requests and sell/invoice workflows are reliable.</action>
  <verify>npm run test:e2e -- tests/e2e/inventory.spec.ts tests/e2e/invoices.spec.ts tests/e2e/sourcing.spec.ts</verify>
  <done>Previously failing setup/create flows pass under e2e automation.</done>
</task>

<task type="auto">
  <name>Task 3: Run full targeted Phase-4 demo QA sweep</name>
  <files>tests/e2e/dashboard-shell.spec.ts, tests/e2e/inventory.spec.ts, tests/e2e/evaluator.spec.ts, tests/e2e/market-research.spec.ts, tests/e2e/sourcing.spec.ts, tests/e2e/jobs.spec.ts, tests/e2e/invoices.spec.ts, tests/e2e/sidecar-flow.spec.ts</files>
  <action>Execute the targeted cross-page walkthrough suites plus full Vitest regression suite and typecheck to close QA-01.</action>
  <verify>npm run typecheck && npm run test && npm run test:e2e -- tests/e2e/dashboard-shell.spec.ts tests/e2e/inventory.spec.ts tests/e2e/evaluator.spec.ts tests/e2e/market-research.spec.ts tests/e2e/sourcing.spec.ts tests/e2e/jobs.spec.ts tests/e2e/invoices.spec.ts tests/e2e/sidecar-flow.spec.ts</verify>
  <done>All targeted demo-path suites and unit tests pass with no unresolved blockers.</done>
</task>

</tasks>

<verification>
- [x] `npm run typecheck`
- [x] `npm run test` (39 files, 220 tests)
- [x] `npm run test:e2e -- tests/e2e/dashboard-shell.spec.ts tests/e2e/inventory.spec.ts tests/e2e/evaluator.spec.ts tests/e2e/market-research.spec.ts tests/e2e/sourcing.spec.ts tests/e2e/jobs.spec.ts tests/e2e/invoices.spec.ts tests/e2e/sidecar-flow.spec.ts` (29 tests)
</verification>

<success_criteria>
- QA-01 complete.
- UI polish milestone marked complete (4/4 phases).
- Validation evidence captured in summary artifact.
</success_criteria>
