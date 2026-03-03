# Milestones

## v1.0 — Supplier Engine Sidecar Release

**Shipped:** 2026-03-01
**Phases:** 1-9
**Plans:** 9 total

**Delivered:** A fully functional luxury resale sourcing intelligence platform — price check, serial decode, landed cost, market research, inventory management, sourcing pipeline, invoicing, jobs, and sidecar mode — all operational and demo-ready.

**Key accomplishments:**
1. Full-stack TypeScript monorepo with Firebase Firestore, Express API, React/Vite frontend, and shared Zod schemas
2. Buy Box evaluator with AI-powered market comparable lookup and landed-cost modelling
3. Serial check with brand decode and age-adjusted price guidance
4. Market Research with AI-driven research sessions and saved results
5. Unified Sourcing Intelligence `/evaluate` — price + serial + landed-cost in one description-first flow
6. Sidecar mode (`?mode=sidecar`) — compact widget for quick lookups from any workflow

**Archive:** `.planning/milestones/v1.0-MILESTONE-AUDIT.md`

---

## v2.0 — UI Polish Demo Readiness

**Shipped:** 2026-03-02
**Phases:** Polish-1, Polish-2, Polish-3, Polish-4 (+ Sprint 4/5 Hardening)
**Plans:** 4 (+ 5 hardening sprints)

**Delivered:** A fully demo-ready dashboard with bold visual hierarchy, energetic Framer Motion animations, skeleton loading screens, animated AI progress steps, image lightbox/preview, and Sprint 4/5 hardening — all 11 pages clean with no blank states or console errors.

**Key accomplishments:**
1. Bold DockBar redesign with animated gold active indicator and polished section labels; sidecar segmented-control tabs
2. Spring-based route-level entrance animations + micro-interactions across all 11 pages (`.lux-card`, `.lux-btn-*` CSS transitions)
3. AI progress steps (`AiProgressSteps`), live result preview (`LiveResultPreview`), and image lightbox (`ImageLightbox`) components wired into EvaluatorView, UnifiedIntelligence, SerialCheck, MarketResearch, and QuickCheck
4. Full 11-page demo QA sweep — no blank states, no console errors, styled empty states everywhere
5. Sprint 4/5 hardening: shared UI primitives (`IconButton`, `TableShell`, `FilterChipGroup`), page splits, atomic Firestore writes, bounded queries

**Archive:** `.planning/milestones/v2.0-ROADMAP.md`, `.planning/milestones/v2.0-REQUIREMENTS.md`

---

*Next: v3.0 Agentic Intelligence — Phases 10-12 (AI reliability, agentic market intelligence, ML signal improvements)*
