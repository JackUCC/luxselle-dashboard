# Roadmap: Luxselle UI Polish Milestone

## Milestone: UI Polish — Demo-Ready Dashboard

**Milestone Goal:** Make every page of the Luxselle dashboard look as sharp as the sourcing decisions it supports — bold, energetic, and polished enough to show to anyone. Styling and animation only; zero logic changes.

**Context:** Phases 1-9 of the Supplier Engine milestone are complete. Phases 10-12 (v3.0 Agentic Intelligence) are deferred until this milestone ships. The codebase is fully functional — this milestone is front-end presentation only.

**Constraint:** No changes to data fetching, business logic, API routes, state management, or backend code. Framer Motion 12, Tailwind CSS 3.4, and tailwindcss-animate are already installed — no new dependencies.

---

## Phases

- [ ] **Phase Polish-1: Design Foundation and Navigation Polish** - Bold visual hierarchy, advanced navbar, and professional sidecar widget treatment
- [ ] **Phase Polish-2: Animation Layer and Skeleton Loading** - Energetic Framer Motion animations across all 11 pages and skeleton loading screens
- [ ] **Phase Polish-3: AI Loaders and Previews** - Animated AI progress steps, product image lightbox, and inline AI result previews
- [ ] **Phase Polish-4: Demo QA Sweep** - All 11 pages verified clean, no blank states or broken layouts in the happy path

---

## Phase Details

### Phase Polish-1: Design Foundation and Navigation Polish
**Goal:** The navigation and sidecar widget feel intentional and premium — users immediately sense the tool has been designed with care.
**Depends on:** Nothing (first phase of this milestone)
**Requirements:** STYLE-01, STYLE-02
**Success Criteria** (what must be TRUE):
  1. The sidebar navigation shows clear visual hierarchy — active page is unmistakable, hover states respond with smooth transitions, section groupings (Intelligence / Operations) are visually distinct.
  2. Clicking between nav items feels animated and deliberate, not instant and abrupt.
  3. The sidecar widget (`?mode=sidecar`) looks professional at compact widths — text is scannable, spacing is tight but not cramped, and the layout communicates at a glance.
  4. Sidecar mode and overview mode each feel like a considered layout, not an afterthought.
**Plans:** TBD

### Phase Polish-2: Animation Layer and Skeleton Loading
**Goal:** Every page feels alive — entering a page and loading data are both visually satisfying experiences rather than instant or blank.
**Depends on:** Phase Polish-1
**Requirements:** ANIM-01, LOAD-01
**Success Criteria** (what must be TRUE):
  1. Navigating to any of the 11 pages produces a visible entrance animation (not an instant render) — content slides, fades, or rises in on arrival.
  2. Buttons, cards, and interactive elements respond to hover and click with micro-interactions — the UI feels reactive.
  3. Every data-driven page (Dashboard, Inventory, Invoices, Sourcing, Jobs, Market Research, Saved Research) shows skeleton placeholders while data loads rather than a blank screen or a spinner.
  4. Skeleton screens are shaped like the content they replace — grid skeletons for lists, card skeletons for panels.
**Plans:** TBD

### Phase Polish-3: AI Loaders and Previews
**Goal:** Long-running AI operations feel transparent and dramatic rather than opaque, and product/result content can be previewed without leaving context.
**Depends on:** Phase Polish-2
**Requirements:** LOAD-02, PREV-01, PREV-02
**Success Criteria** (what must be TRUE):
  1. Triggering a market research, price check, or sourcing analysis shows an animated step indicator — labelled steps ("Searching…", "Analysing…", "Building report…") progress visibly rather than showing a generic spinner.
  2. Users can hover or click a product image thumbnail to see the full-size image in a lightbox or popover without navigating away.
  3. AI analysis panels update as results arrive — partial content appears and builds rather than the panel staying blank until the full result is ready.
  4. The AI progress step display communicates which stage the operation is in at all times during a run.
**Plans:** TBD

### Phase Polish-4: Demo QA Sweep
**Goal:** Every page can be visited end-to-end in a demo without encountering a blank state, broken layout, or console error.
**Depends on:** Phase Polish-3
**Requirements:** QA-01
**Success Criteria** (what must be TRUE):
  1. All 11 pages (Dashboard, Inventory, BuyBox, MarketResearch, Invoices, Jobs, RetailPrice, SavedResearch, SerialCheck, Sourcing, UnifiedIntelligence) load and display content without blank panels or broken containers.
  2. No uncaught console errors appear during a standard happy-path walkthrough of all pages.
  3. Empty states (zero data in a list) show a styled empty-state component, not a blank panel.
  4. All animations and skeletons introduced in earlier phases display correctly across all 11 pages without layout regressions.
  5. Existing Vitest unit tests continue to pass — no regressions from styling changes.
**Plans:** TBD

---

## Progress

**Execution Order:** Polish-1 -> Polish-2 -> Polish-3 -> Polish-4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| Polish-1. Design Foundation and Navigation Polish | 0/TBD | Not started | — |
| Polish-2. Animation Layer and Skeleton Loading | 0/TBD | Not started | — |
| Polish-3. AI Loaders and Previews | 0/TBD | Not started | — |
| Polish-4. Demo QA Sweep | 0/TBD | Not started | — |

---

## Requirement Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| STYLE-01 | Phase Polish-1 | Pending |
| STYLE-02 | Phase Polish-1 | Pending |
| ANIM-01 | Phase Polish-2 | Pending |
| LOAD-01 | Phase Polish-2 | Pending |
| LOAD-02 | Phase Polish-3 | Pending |
| PREV-01 | Phase Polish-3 | Pending |
| PREV-02 | Phase Polish-3 | Pending |
| QA-01 | Phase Polish-4 | Pending |

**Coverage:** 8/8 UI polish requirements mapped. No orphans.

---

## Deferred Milestones

The following phases from the v3.0 Agentic Intelligence milestone are deferred until this UI Polish milestone is complete:

- Phase 10: AI Reliability + Provider Diagnostics (STAB-01)
- Phase 11: INTEL-02 Agentic Market Intelligence (INTEL-02)
- Phase 12: Inventory + Invoice Verification + ML-01 (QUAL-01, ML-01)

---

*Roadmap created: 2026-03-02 — UI Polish milestone kickoff*
