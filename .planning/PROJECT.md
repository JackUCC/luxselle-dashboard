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

### Active

- [ ] Unified Sourcing Intelligence page — combine Price Check + Serial Check + Landed Cost into one description-first flow on a single page; serial is optional, landed cost always visible
- [ ] Agentic Market Intelligence — background competitor + trend scraping that runs continuously, plus on-demand deep-dive research mode; feeds Market Research and Competitor Activity
- [ ] Design consistency pass — OCD-level polish so every page feels like the same product: consistent card styles, spacing, typography, empty states, loading states
- [ ] Sidebar visual cleanup — declutter icons, spacing, and grouping so navigation is clean and purposeful
- [ ] Inventory + Invoice verification — confirm all flows work end-to-end: status changes, create/save/export invoice, edge cases
- [ ] ML/API advancement — maximize intelligence across all tools: smarter price predictions, better serial decode confidence, trend signals from scraped data

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
- Current pages: Overview, Price Check (/buy-box), Retail Price, Serial Check, Market Research, Saved Research, Inventory, Sourcing, Invoices
- Competitor Activity exists as a component/feed but not a dedicated nav item
- The combined Sourcing Intelligence page replaces the separate /buy-box and /serial-check routes (or wraps them)

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
*Last updated: 2026-02-28 after initialization*
