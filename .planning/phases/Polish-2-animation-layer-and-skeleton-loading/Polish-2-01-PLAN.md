---
phase: Polish-2-animation-layer-and-skeleton-loading
plan: "01"
type: execute
wave: 1
depends_on:
  - Polish-1-01
files_modified:
  - src/components/layout/PageTransition.tsx
  - src/components/layout/PageLayout.tsx
  - src/styles/index.css
  - src/LuxselleApp.tsx
  - src/pages/MarketResearch/MarketResearchView.tsx
autonomous: true
requirements:
  - ANIM-01
  - LOAD-01
must_haves:
  truths:
    - "Route entry motion is visibly deliberate across pages while preserving reduced-motion behavior."
    - "Buttons and cards have consistent micro-interaction feedback."
    - "Data-loading states present shaped skeletons instead of blank/spinner-only panels."
---

<objective>
Execute Phase Polish-2 by strengthening cross-page motion and ensuring skeleton-first loading treatment across all targeted data-driven pages.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Strengthen route/page entrance animation layer</name>
  <files>src/components/layout/PageTransition.tsx, src/components/layout/PageLayout.tsx</files>
  <action>Increase visibility and quality of page-entry transitions with spring-based motion and consistent per-page entrance treatment.</action>
  <verify>npm run typecheck</verify>
  <done>Navigation between pages feels animated and intentional.</done>
</task>

<task type="auto">
  <name>Task 2: Add stronger micro-interactions for cards and buttons</name>
  <files>src/styles/index.css</files>
  <action>Upgrade hover/press behavior on core surfaces and buttons to improve responsiveness and polish.</action>
  <verify>npm run typecheck</verify>
  <done>Interactive surfaces provide immediate visual feedback.</done>
</task>

<task type="auto">
  <name>Task 3: Ensure skeleton coverage during loading states</name>
  <files>src/LuxselleApp.tsx, src/pages/MarketResearch/MarketResearchView.tsx</files>
  <action>Replace generic suspense/loading placeholders with shaped skeletons and add result-panel skeleton treatment while market research is loading.</action>
  <verify>npm run typecheck</verify>
  <done>No blank or spinner-only major loading surfaces remain in target pages.</done>
</task>

</tasks>

<verification>
- [x] `npm run typecheck`
- [ ] `npm run test` (blocked by sandbox `EPERM` for server listener binding)
</verification>

<success_criteria>
- ANIM-01 complete.
- LOAD-01 complete.
- Styling-only constraint maintained.
</success_criteria>
