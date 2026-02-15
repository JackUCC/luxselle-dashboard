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
- "Use Frontend Flows QA to check Buy Box and Supplier Hub regressions."
- "Use Data Pipeline QA to validate Gmail import reliability."
- "Use Docs Improvement to update deployment and runbook docs."

## Quality Gates

A release is green only when all are true:
1. Server tests pass.
2. Frontend build and typecheck pass.
3. Supplier email sync path is operationally configured.
4. Buy Box IE-first behaviour is verified.
5. Landed-cost snapshots persist from evaluation to buying list.
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

## Reporting Format

Each run should output:
- Readiness verdict: `Ready` or `Not ready`
- Blockers
- High-priority risks
- Improvement backlog
- Missing owner inputs
