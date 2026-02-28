# Phase 7: Sidecar Mode Hardening + Agent Execution - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Make Sidecar mode production-ready for compact, side-by-side purchasing workflows. Scope is limited to layout hardening, Overview/Sidecar behavior parity, and release QA for evaluator -> inventory -> invoicing journeys.

</domain>

<decisions>
## Implementation Decisions

### Compact layout behavior
- Sidecar must remain usable at narrow widths for QuickCheck, SidecarView, Evaluator, Inventory, and Invoices.
- Overflow and min-width issues should be fixed without introducing horizontal scroll for primary actions.

### Mode-adaptive behavior parity
- Actions available in Overview must behave consistently in Sidecar when the same user intent exists.
- Mode switching should preserve route context where possible and avoid disorienting resets.

### Release-readiness QA
- QA must explicitly cover evaluator decision -> inventory awareness -> invoicing follow-up.
- Signoff requires no P0 regressions in compact-mode workflows.

### Claude's Discretion
- Exact CSS/layout strategy (grid vs flex adjustments, breakpoint details).
- Choice of automated/manual split for parity and journey checks.
- How to structure incremental commits across plan tasks.

</decisions>

<specifics>
## Specific Ideas

- Keep edits iterative and low-risk; avoid broad refactors in this phase.
- Leverage existing sidecar components and mode context instead of introducing new navigation architecture.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/sidecar/QuickCheck.tsx`: compact quick evaluation entry.
- `src/components/sidecar/SidecarView.tsx`: sidecar shell and panel composition.
- `src/lib/LayoutModeContext.tsx`: authoritative mode state (`overview` or `sidecar`).

### Established Patterns
- Route-level pages already exist for Evaluator, Inventory, and Invoices.
- Dashboard and operations pages use existing card/layout conventions that should be preserved.

### Integration Points
- `src/LuxselleApp.tsx`: mode-aware routing/shell integration.
- `src/pages/BuyBox`, `src/pages/Inventory`, `src/pages/Invoices`: compact-mode behavior adjustments.
- `docs/planning/PLAN.md` and `docs/planning/STATUS_AND_PLAN.md`: source-of-truth summaries for phase scope.

</code_context>

<deferred>
## Deferred Ideas

- Unified Sourcing Intelligence page consolidation.
- Agentic background market intelligence expansion.
- Broader design-system overhaul beyond sidecar hardening.

</deferred>

---
*Phase: 07-sidecar-mode-hardening-agent-execution*
*Context gathered: 2026-02-28*
