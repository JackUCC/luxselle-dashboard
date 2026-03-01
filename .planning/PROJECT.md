# Luxselle Dashboard

## What This Is

Luxselle Dashboard is an internal sourcing intelligence tool for luxury resale. It is the tool you open before every purchase decision — enter an item, get price guidance, landed cost, serial decode, and agentic market intelligence all in one place. The goal is to make it the definitive command centre for sourcing luxury goods profitably.

## Core Value

Every purchase decision runs through this tool — enter an item, get everything you need to know before committing.

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
- ✓ Competitor Activity feed — track competitor listing activity
- ✓ Overview/Dashboard — summary of key metrics

### Active (v2 complete, v3 planned)

- [x] Unified Sourcing Intelligence page — `/evaluate` route with price + optional serial + landed-cost in one flow
- [x] Design consistency pass — uniform card styles, spacing, typography, empty/loading states
- [x] Sidebar visual cleanup — Intelligence / Operations groups, clean icons and spacing
- [x] Dynamic AI routing — Perplexity preferred for web search, OpenAI for structured extraction; automatic fallback
- [x] Price checker reliability — provenance filter, two-stage strategy, dedup, outlier filter, clearer UX
- [ ] **STAB-01**: AI provider reliability — surface "provider unavailable" errors in UI instead of silent €0 fallback
- [ ] **INTEL-02**: Agentic Market Intelligence — background monitoring + on-demand deep-dive research
- [ ] **QUAL-01**: Inventory + Invoice E2E verification — confirm all flows, edge cases, test coverage
- [ ] **ML-01**: ML/API advancement — smarter price predictions, confidence scores, trend signals

### Out of Scope

- Mobile app — web-first; mobile can come later
- Customer-facing features — internal tool only
- Multi-user / team accounts — single-operator for now
- Real-time notifications / push — not a priority for v1 polish milestone
- Public marketplace integrations (listing to Vestiaire etc.) — out of scope this cycle

## Context

- TypeScript monorepo: React/Vite frontend + Express backend + shared Zod schemas
- Firebase Firestore (emulator local, production GCP)
- Deploy: Vercel (frontend), Railway (backend)
- AI provider: OpenAI (with mock for tests)
- Navigation has two sections: "check" (tools) and "manage" (operations)
- Current pages: Overview, Sourcing Intelligence (/evaluate), Retail Price, Market Research, Saved Research, Inventory, Sourcing, Invoices
- Competitor Activity exists as a component/feed but not a dedicated nav item
- Legacy /buy-box and /serial-check routes redirect to /evaluate for compatibility

## Constraints

- **Tech Stack**: TypeScript/React/Vite + Express — no framework changes
- **Testing**: All changes must pass existing Vitest suite; new flows need tests
- **AI Costs**: Agentic scraping must be cost-aware — background jobs batched, not per-request
- **No regressions**: Inventory, Sourcing, Invoices must continue to work while being verified

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Description-first on combined page | User starts with item description, not serial — serial is supplementary | — Pending |
| Agentic intel = background + on-demand | User wants always-on monitoring AND ability to trigger deep dives | — Pending |
| Sidebar: polish not restructure | Visual clutter is the issue, not the information architecture | — Pending |
| Inventory: verify don't rebuild | Already works well; needs testing not rewriting | — Pending |

---
*Last updated: 2026-03-01 after Phase 9 completion + v3 planning + stabilization fixes*
