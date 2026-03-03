# Luxselle Dashboard

## What This Is

Luxselle Dashboard is an internal sourcing intelligence tool for luxury resale. It is the tool you open before every purchase decision — enter an item, get price guidance, landed cost, serial decode, animated AI progress, and agentic market intelligence all in one place. The UI is bold, energetic, and demo-ready across all 11 pages.

## Core Value

Every purchase decision runs through this tool — enter an item, get everything you need to know before committing. It needs to feel as sharp as the decisions it supports.

## Current State

**Shipped:** v2.0 UI Polish Demo Readiness (2026-03-02)

- 11 pages fully operational and demo-ready: Dashboard, Inventory, BuyBox, MarketResearch, Invoices, Jobs, RetailPrice, SavedResearch, SerialCheck, Sourcing, UnifiedIntelligence
- Bold visual hierarchy, energetic Framer Motion animations, skeleton loading, animated AI progress steps, image lightbox/preview across all views
- Sprint 4/5 hardening complete: shared UI primitives, page splits, atomic Firestore writes, bounded queries
- TypeScript monorepo (React/Vite + Express + shared Zod schemas) — Firebase Firestore, Vercel (frontend) + Railway (backend)
- Framer Motion 12, Tailwind CSS 3.4

**Next:** v3.0 Agentic Intelligence — Phases 10-12 (AI reliability, agentic market intel, ML signal improvements)

## Requirements

### Validated

- ✓ Price Check (Buy Box) — market comparable lookup with AI-powered search — v1.0
- ✓ Serial Check — brand serial decode + age-adjusted price guidance — v1.0
- ✓ Landed Cost Calculator — duty, VAT, shipping cost modelling — v1.0
- ✓ Market Research — AI-driven research sessions with saved results — v1.0
- ✓ Saved Research — persist and revisit research sessions — v1.0
- ✓ Inventory management — track stock, status, product details — v1.0
- ✓ Sourcing tracker — manage supplier leads and deal pipeline — v1.0
- ✓ Invoices — create, save, export invoices — v1.0
- ✓ Jobs — background job tracking and visibility — v1.0
- ✓ Overview/Dashboard — summary of key metrics and activity feed — v1.0
- ✓ Unified Sourcing Intelligence — `/evaluate` with price + serial + landed-cost in one flow — v1.0
- ✓ Sidecar mode — compact `?mode=sidecar` widget for quick lookups — v1.0
- ✓ Navigation — grouped sidebar with Intelligence / Operations sections — v1.0
- ✓ Dynamic AI routing — Perplexity + OpenAI fallback, per-task timeouts — v1.0
- ✓ STYLE-01: Bold navbar visual hierarchy, animated transitions — v2.0
- ✓ STYLE-02: Sidecar widget — professional and scannable in compact mode — v2.0
- ✓ ANIM-01: Framer Motion entrance animations + micro-interactions across all 11 pages — v2.0
- ✓ LOAD-01: Skeleton loading screens for all data-driven pages — v2.0
- ✓ LOAD-02: Animated AI progress steps for all long-running AI operations — v2.0
- ✓ PREV-01: Product image lightbox (hover/click full-size preview) — v2.0
- ✓ PREV-02: Inline result previews — AI panels show partial results as they arrive — v2.0
- ✓ QA-01: Demo readiness — 11 pages clean, no blank states or console errors — v2.0
- ✓ HARDEN-01 through HARDEN-05: Sprint 4/5 hardening — UI primitives, page splits, atomic writes, bounded queries, validation — v2.0

### Active (v3.0 Agentic Intelligence)

- [ ] **STAB-01**: AI provider failures surfaced clearly in the UI with recoverable error states
- [ ] **INTEL-02**: Agentic Market Intelligence — continuous background monitoring and on-demand deep dives
- [ ] **QUAL-01**: Inventory and Invoice flows verified end-to-end with full test evidence
- [ ] **ML-01**: ML/API intelligence upgrades for price prediction confidence and trend signaling

### Out of Scope

- Logic or business rule changes during UI polish — maintained as constraint for v2.0
- Auth hardening — deferred beyond demo use case
- Mobile app — web-first
- Multi-user / team accounts — single-operator
- Customer-facing features — internal operator tool only

## Context

- TypeScript monorepo: React/Vite frontend + Express backend + shared Zod schemas
- Firebase Firestore (emulator local, production GCP); Vercel (frontend) + Railway (backend)
- Framer Motion 12 installed — primary animation tool
- Tailwind CSS 3.4 + tailwindcss-animate configured
- 11 pages: Dashboard, Inventory, BuyBox, MarketResearch, Invoices, Jobs, RetailPrice, SavedResearch, SerialCheck, Sourcing, UnifiedIntelligence
- Sidecar mode via `?mode=sidecar` — compact layout branch in components
- Navigation sidebar: Intelligence tools + Operations/management sections
- Phase 10 plan ready at `.planning/phases/10-ai-reliability-provider-diagnostics/10-01-PLAN.md`
- Active debug session: price-check inaccurate results (`.planning/debug/price-check-inaccurate-results.md`)
- Known issue: full `npm run test:e2e` pretest hangs in local environment; targeted suites pass

## Constraints

- **Tech stack**: TypeScript/React/Vite — no new dependencies unless clearly justified
- **Animation**: Framer Motion (already installed) — no additional animation libs
- **No regressions**: Existing Vitest suite must continue to pass
- **Auth**: Unprotected in dev by design; `SKIP_AUTH=true` for e2e

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Styling-only constraint (v2.0) | Logic working; regression risk not worth it for a polish milestone | ✓ Applied — no regressions |
| Bold & energetic visual style | Tool should feel as decisive as the sourcing decisions it supports | ✓ Applied |
| Animated AI progress steps | More dramatic and legible than raw streaming text for demos | ✓ Applied |
| Framer Motion for all animation | Already installed — no new deps | ✓ Applied |
| Deferred v3.0 Phases 10-12 | Polish first; resume Agentic Intelligence work after v2.0 ships | ✓ Applied — phases ready |
| `SKIP_AUTH=true` for e2e stack | Deterministic Playwright setup calls without production auth wiring | ✓ Applied |
| Atomic Firestore writes (Sprint 4.4) | Prevent partial write states in product transaction/sell flows | ✓ Applied |
| Bounded repo queries (Sprint 4.5) | Reduce UI-visible latency on dashboard/status by avoiding full scans | ✓ Applied |
| Shared UI primitives (Sprint 4.1) | Extract `IconButton`, `TableShell`, `FilterChipGroup` for maintainability | ✓ Applied |

---

*Last updated: 2026-03-03 after v2.0 milestone*
