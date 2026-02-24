# QA Swarm Playbook

This playbook defines how to run the QA/documentation swarm for release confidence.

## Agent Stack

1. `agent-quality-lead`
2. `agent-qa-backend-contracts`
3. `agent-qa-frontend-flows`
4. `agent-qa-data-pipeline`
5. `agent-docs-improvement`

## Fast Invocation Prompts

- "Use Quality Lead to run release readiness for the current branch."
- "Use Backend Contracts QA to test new pricing and supplier routes."
- "Use Frontend Flows QA to check Buy Box, Inventory, and Sidecar regressions."
- "Use Data Pipeline QA to validate Gmail import reliability."
- "Use Docs Improvement to update deployment and runbook docs."

## Quality Gates

A release is green only when all are true:
1. Server tests pass.
2. Frontend build and typecheck pass.
3. Supplier email sync path is operationally configured.
4. Buy Box IE-first behaviour is verified.
5. Landed-cost and decision metrics persist from evaluation to sourcing or inventory actions.
6. Deployment docs match implementation.

## Default Command Set

```bash
npm run test --workspace=@luxselle/server
npm run build
npm run typecheck
```

(`typecheck` runs `tsc --noEmit` from the repo root; see root `package.json`.)

Optional when e2e environment is available (start dev + emulators first for reliable runs):

```bash
npm run test:e2e
```

## E2E Reliability Runbook

For reliable E2E test runs, use two terminal sessions:

**Terminal 1** — start the full dev stack and wait for it to be ready:

```bash
npm run dev
```

Wait until you see both:
- `VITE ready in … ms` (Vite frontend on http://localhost:5173)
- `API server running on http://0.0.0.0:3001` (Express backend on :3001)

**Terminal 2** — run E2E tests only after both services are up:

```bash
npm run test:e2e
```

`npm run dev` launches the Firebase emulators, the Express API (`:3001`), and the Vite dev server (`:5173`) concurrently via `concurrently -k`. Do not run `npm run test:e2e` before both services report ready, or tests will fail with connection-refused errors.

## 4-Wave Swarm Structure

This sprint used a structured 4-wave agent swarm pattern:

| Wave | Name | Agents | Focus |
|------|------|--------|-------|
| **Wave 0** | Baseline | Single agent | Read codebase, confirm tests green, snapshot state |
| **Wave 1** | Backend + Tests + Data | Multiple agents (parallel) | New routes, service layer, test coverage, data pipeline |
| **Wave 2** | Frontend + Docs | Multiple agents (parallel) | UI integration of new APIs, docs sync and improvement |
| **Wave 3** | Validation + Report | Single agent | Run full test suite, typecheck, build, write release report |

**Key principles:**
- Wave 0 and Wave 3 run sequentially (single agent); Waves 1 and 2 run in parallel within their wave.
- Each agent in Waves 1 and 2 has strict file ownership (e.g. Wave 2E owns `docs/` only).
- No agent touches files outside its ownership boundary.
- Wave 3 runs all quality gates from the Default Command Set above before declaring readiness.

## One-command Launcher

You can print the full swarm prompts and command checklist via:

```bash
npm run agents:launch
```

To print the plan and execute validation checks in sequence:

```bash
npm run agents:launch -- --run-checks
```

## Reporting Format

Each run should output:
- Readiness verdict: `Ready` or `Not ready`
- Blockers
- High-priority risks
- Improvement backlog
- Missing owner inputs
