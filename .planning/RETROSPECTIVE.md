# Retrospective — Luxselle Dashboard

Living retrospective. One section per milestone.

---

## Milestone: v1.0 — Supplier Engine Sidecar Release

**Shipped:** 2026-03-01
**Phases:** 9 | **Plans:** 9

### What Was Built

- Full-stack TypeScript monorepo with Firebase Firestore, Express API, React/Vite frontend, Zod schemas
- Buy Box evaluator with AI-powered market comparable lookup and landed-cost modelling
- Serial check with brand decode and age-adjusted price guidance
- Market Research with AI-driven sessions and saved results
- Unified Sourcing Intelligence — price + serial + landed-cost in one description-first flow
- Sidecar mode (`?mode=sidecar`) — compact widget for quick lookups

### What Worked

- Zod schema sharing between frontend and backend eliminated an entire class of type mismatches
- Firebase emulator-first workflow kept local dev deterministic without cloud credentials
- Phased scope (9 focused phases) kept each unit of work small and verifiable

### What Was Inefficient

- Some phases delivered before GSD tracking was introduced — no VERIFICATION.md files for Phases 1-6; ROADMAP.md became the authoritative completion record
- Auth middleware deferred by design created an ambiguous "protected in prod, open in dev" state that needed explicit documentation

### Patterns Established

- BaseRepo pattern for Firestore CRUD — all repos extend it consistently
- Zod validation at route level using `req.body` parsing before service calls
- `useEffect + apiGet + useState` per-page state pattern (React Query available for incremental migration)

### Key Lessons

- Defer authentication until it blocks something — the dev-open approach was the right call for moving fast
- Seed data matters: deterministic seeded data made all subsequent phases (and demos) much smoother
- Phase 9 (Unified Intelligence) was the right capstone — pulling together all prior work into a single flow validated integration

### Cost Observations

- Sessions: ~9 focused execution sessions
- Notable: parallel agent execution kept context lean per phase

---

## Milestone: v2.0 — UI Polish Demo Readiness

**Shipped:** 2026-03-02
**Phases:** 4 (Polish-1 through Polish-4) + Sprint 4/5 Hardening
**Plans:** 4

### What Was Built

- Bold DockBar redesign with animated gold active indicator, polished section labels, sidecar segmented-control tabs
- Spring-based route-level entrance animations + micro-interactions across all 11 pages
- `AiProgressSteps`, `LiveResultPreview`, `ImageLightbox` — reusable components wired into 5 AI-heavy views
- Full 11-page demo QA sweep — no blank states, no console errors, styled empty states everywhere
- Sprint 4/5: shared UI primitives (`IconButton`, `TableShell`, `FilterChipGroup`), page splits, atomic Firestore writes, bounded queries

### What Worked

- Styling-only constraint was the right guardrail — prevented scope creep and kept regression risk minimal
- Building reusable feedback components (`AiProgressSteps`, `LiveResultPreview`, `ImageLightbox`) first in Polish-3, then wiring them everywhere, was dramatically more efficient than per-page implementations
- Sprint 4/5 hardening as a post-polish wave was the right sequencing — polish first, then harden for maintainability

### What Was Inefficient

- DockBar hover/dynamic effects needed a post-hardening fix commit — minor detail that escaped the QA sweep
- Full `npm run test:e2e` pretest hangs locally due to browser setup environment issues; required targeted suite workaround throughout the milestone
- Sprint 4/5 was planned separately from the Polish phases but was structurally part of the same milestone — could have been a Phase Polish-5 instead of a standalone wave

### Patterns Established

- Reusable feedback component pattern: build `AiProgressSteps`, `LiveResultPreview`, `ImageLightbox` once → export from `src/components/feedback/index.ts` → import everywhere
- `SKIP_AUTH=true` environment flag for e2e determinism in dev without production auth wiring
- Design-system primitive extraction: `IconButton`, `TableShell`, `FilterChipGroup` as shared building blocks
- Atomic Firestore batch writes for any multi-document mutation flow

### Key Lessons

- A "styling-first" milestone is only successful if the constraint is actively enforced — no exceptions creep in
- Skeleton loading and AI progress steps deliver disproportionate polish-to-effort ratio (they're perceived as high quality by observers)
- A QA sweep phase (Polish-4) dedicated to no-blank-states / no-console-errors is worth its own phase even if it feels small — it catches things no automated test catches

### Cost Observations

- Sessions: ~5 focused execution sessions
- Notable: each Polish phase was a single plan — minimal orchestration overhead

---

## Cross-Milestone Trends

| Metric | v1.0 | v2.0 |
|--------|------|------|
| Phases | 9 | 4 (+hardening) |
| Plans | 9 | 4 |
| Avg LOC changed per phase | ~200 | ~350 |
| Regressions caught in QA | 0 | 1 (DockBar hover) |
| Test failures at close | 0 | 0 (targeted suites) |

**Recurring patterns:**
- Build shared primitives early → wire everywhere → net win
- Targeted suite approach (not full e2e) was pragmatic for local dev constraints
- Post-milestone hardening waves work but consider making them a named phase next time

---

*Retrospective started: 2026-03-03 at v2.0 milestone close*
