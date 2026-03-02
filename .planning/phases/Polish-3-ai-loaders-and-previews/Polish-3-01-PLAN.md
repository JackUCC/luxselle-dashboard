---
phase: Polish-3-ai-loaders-and-previews
plan: "01"
type: execute
wave: 1
depends_on:
  - Polish-2-01
files_modified:
  - src/components/feedback/AiProgressSteps.tsx
  - src/components/feedback/LiveResultPreview.tsx
  - src/components/feedback/ImageLightbox.tsx
  - src/components/feedback/index.ts
  - src/pages/BuyBox/EvaluatorView.tsx
  - src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx
  - src/pages/SerialCheck/SerialCheckView.tsx
  - src/pages/MarketResearch/MarketResearchView.tsx
  - src/pages/MarketResearch/MarketResearchResultPanel.tsx
  - src/components/sidecar/QuickCheck.tsx
autonomous: true
requirements:
  - LOAD-02
  - PREV-01
  - PREV-02
must_haves:
  truths:
    - "AI operations show explicit staged progress instead of generic spinner-only loading."
    - "Result panels show building/preview content during active AI runs rather than blank placeholders."
    - "Comparable and visual-match thumbnails can be enlarged in-context with no navigation."
    - "Changes remain frontend presentation-only (no backend/API/state model changes)."
---

<objective>
Execute Phase Polish-3 by introducing staged AI progress UX, live inline result previews, and click-to-preview image lightboxes across key AI decision flows.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Build shared polish primitives for AI operations</name>
  <files>src/components/feedback/AiProgressSteps.tsx, src/components/feedback/LiveResultPreview.tsx, src/components/feedback/ImageLightbox.tsx, src/components/feedback/index.ts</files>
  <action>Create reusable progress-step, live-result-preview, and image-lightbox components for consistent AI loader and preview behavior.</action>
  <verify>npm run typecheck</verify>
  <done>Shared components available and type-safe for reuse across page flows.</done>
</task>

<task type="auto">
  <name>Task 2: Replace generic AI loading UI with staged progress + inline previews</name>
  <files>src/pages/BuyBox/EvaluatorView.tsx, src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx, src/pages/SerialCheck/SerialCheckView.tsx, src/pages/MarketResearch/MarketResearchView.tsx, src/components/sidecar/QuickCheck.tsx</files>
  <action>Swap indeterminate bars for labeled staged progress and show inline live-result preview panels during in-flight analysis.</action>
  <verify>npm run typecheck</verify>
  <done>Price check, market research, sourcing intelligence, serial analysis, and sidecar quick-check all expose visible staged AI progress.</done>
</task>

<task type="auto">
  <name>Task 3: Add in-context image lightbox previews on comparable/media thumbnails</name>
  <files>src/pages/BuyBox/EvaluatorView.tsx, src/pages/UnifiedIntelligence/UnifiedIntelligenceView.tsx, src/pages/SerialCheck/SerialCheckView.tsx, src/pages/MarketResearch/MarketResearchResultPanel.tsx, src/components/sidecar/QuickCheck.tsx</files>
  <action>Enable click-to-preview thumbnail interactions with enlarged media overlays and optional source links.</action>
  <verify>npm run typecheck</verify>
  <done>Thumbnail previews open full-size images without route changes or layout disruption.</done>
</task>

</tasks>

<verification>
- [x] `npm run typecheck`
- [ ] `npm run test` (sandbox-limited: `EPERM` on listener binding in server route tests)
</verification>

<success_criteria>
- LOAD-02 complete.
- PREV-01 complete.
- PREV-02 complete.
- Styling-only constraint maintained.
</success_criteria>
