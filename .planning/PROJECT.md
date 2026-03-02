# Luxselle Dashboard

## What This Is

Luxselle Dashboard is an internal sourcing intelligence tool for luxury resale. It is the tool you open before every purchase decision — enter an item, get price guidance, landed cost, serial decode, and agentic market intelligence all in one place. The goal is to make it the definitive command centre for sourcing luxury goods profitably.

## Core Value

Every purchase decision runs through this tool — enter an item, get everything you need to know before committing. It needs to feel as sharp as the decisions it supports.

## Requirements

### Validated

- ✓ Price Check (Buy Box) — market comparable lookup with AI-powered search
- ✓ Serial Check — brand serial decode + age-adjusted price guidance
- ✓ Landed Cost Calculator — duty, VAT, shipping cost modelling
- ✓ Market Research — AI-driven research sessions with saved results
- ✓ Saved Research — persist and revisit research sessions
- ✓ Inventory management — track stock, status, product details
- ✓ Sourcing tracker — manage supplier leads and deal pipeline
- ✓ Invoices — create, save, export invoices
- ✓ Jobs — background job tracking and visibility
- ✓ Overview/Dashboard — summary of key metrics and activity feed
- ✓ Unified Sourcing Intelligence — `/evaluate` with price + serial + landed-cost in one flow
- ✓ Sidecar mode — compact `?mode=sidecar` widget for quick lookups
- ✓ Navigation — grouped sidebar with Intelligence / Operations sections
- ✓ Dynamic AI routing — Perplexity + OpenAI fallback, per-task timeouts

### Active (UI Polish Milestone)

- [ ] **STYLE-01**: Advanced navbar — bold visual hierarchy, smooth hover states, active indicators, polished transitions
- [ ] **STYLE-02**: Sidecar widget visual treatment — looks professional and scannable in compact mode
- [ ] **ANIM-01**: Bold, energetic animations — Framer Motion entrance animations, micro-interactions, smooth transitions across all 11 pages
- [ ] **LOAD-01**: Skeleton loading screens — all data-driven pages show skeleton placeholders while fetching
- [ ] **LOAD-02**: Animated AI progress steps — AI operations show step-by-step status ("Searching… Analysing… Building report…") with animated indicators
- [ ] **PREV-01**: Product image previews — hover or click to preview product images at full size
- [ ] **PREV-02**: Inline result previews — AI analysis panels show building results as they arrive
- [ ] **QA-01**: Demo readiness — all 11 pages load cleanly, no blank states or broken layouts in the happy path

### Out of Scope

- Logic or business rule changes — all working code stays untouched
- Auth hardening — not needed for demo
- Backend route changes — styling only
- Mobile app — web-first
- Multi-user / team accounts — single-operator
- v3 AI reliability / agentic intelligence work (Phases 10-12) — deferred; polish first

## Context

- TypeScript monorepo: React/Vite frontend + Express backend + shared Zod schemas
- Firebase Firestore (emulator local, production GCP); Vercel (frontend) + Railway (backend)
- Framer Motion 12 already installed — primary tool for all animations
- Tailwind CSS 3.4 + tailwindcss-animate already configured
- 11 pages: Dashboard, Inventory, BuyBox, MarketResearch, Invoices, Jobs, RetailPrice, SavedResearch, SerialCheck, Sourcing, UnifiedIntelligence
- Sidecar mode via `?mode=sidecar` — compact layout branch in components
- Navigation sidebar: Intelligence tools + Operations/management sections
- **CRITICAL CONSTRAINT**: Styling/UI only. No changes to data fetching, business logic, API routes, state management, or backend code.
- Phases 1-9 complete (v1.0). Phases 10-12 (v3.0 AI reliability + agentic) deferred until after this milestone.

## Constraints

- **Styling only**: Zero changes to business logic, data fetching, API calls, or backend
- **Tech stack**: TypeScript/React/Vite — no new dependencies unless purely cosmetic
- **Animation**: Framer Motion (already installed) — no additional animation libs
- **Demo-ready**: Must look polished enough to show to someone; auth not required
- **No regressions**: Existing Vitest suite must continue to pass

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Styling-only constraint | Logic is working; regression risk not worth it for a polish milestone | — Pending |
| Bold & energetic visual style | Tool should feel as decisive as the sourcing decisions it supports | — Pending |
| Animated AI progress steps (not streaming) | More dramatic and legible than raw streaming text for a demo | — Pending |
| Defer v3 AI reliability phases | Polish first; resume Phase 10 once the tool looks the part | — Pending |
| Framer Motion for all animation | Already installed — no new deps needed | — Pending |

---
*Last updated: 2026-03-02 after UI polish milestone kickoff (Phases 1-9 complete)*
