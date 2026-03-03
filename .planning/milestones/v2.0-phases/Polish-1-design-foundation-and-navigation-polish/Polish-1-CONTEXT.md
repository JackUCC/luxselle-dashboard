# Phase Polish-1: Design Foundation and Navigation Polish - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish the navigation dock and sidecar widget to feel intentional and premium. No logic changes, no new features — only visual treatment, animation feel, and layout refinement. Changes touch: DockBar, SidecarView/SidecarWidgets tabs and cards, and SidecarNav.

</domain>

<decisions>
## Implementation Decisions

### Active nav item treatment
- A **2–3px gold (`lux-gold`) vertical bar** on the left edge of the dock marks the active item
- The bar should animate with the existing Framer Motion `LayoutGroup` spring (`stiffness: 400, damping: 30`) — it slides between items as the user navigates, not an instant swap
- The icon itself stays text-lux-900 when active (no color inversion, no dark fill)
- The existing pale gray background pill (`bg-lux-100`) can remain as a very subtle secondary signal, or be removed — Claude's discretion based on what reads cleanest
- Reference feel: classic macOS sidebar active indicator — unmistakable but not loud

### Hover feel on nav icons
- Scale **1.05** (down from current 1.10) — precise, not bouncy
- Tooltip redesign: soft shadow + light background with a subtle border — Apple HUD callout aesthetic, not the current dark `bg-lux-900` chip
- Tooltip should feel like a system tooltip, not a marketing label

### Section grouping (Intelligence / Operations)
- **Refined, not redesigned** — the micro-label + thin separator pattern stays
- Increase the vertical gap between sections slightly so the grouping is felt, not just read
- Make the section label (`INTELLIGENCE` / `OPERATIONS`) slightly more legible — either 1px larger, fractionally more opacity, or better tracking
- No background zones, no colored tints per section — Apple restraint

### Sidecar tab row (Quick / Batch / Tools)
- Replace the current `bg-lux-800 text-white` active fill with an **iOS segmented control pattern**:
  - Tab row sits on a `bg-lux-100` track (the container)
  - Active tab: white background with `shadow-xs` or `shadow-soft`, slightly rounded pill inside the track
  - Inactive tabs: no background, `text-lux-500`
- Transition between active tabs: smooth crossfade or spring translate, not instant
- Icons remain on tab buttons

### Sidecar widget cards (Tools tab — SidecarWidgets)
- **Cleaner accordion feel**: remove the left border accent (`border-l-2 border-l-lux-200`) from card headers — it adds noise without communicating anything
- Single consistent border on the card container — no extra inner borders
- Soften the expand/collapse animation: the existing `grid-rows-[0fr]/[1fr]` CSS transition should use `ease-out` and possibly slightly longer duration (250ms instead of 200ms) for a smoother unfurl
- Expand/Collapse button: reduce chrome — just a chevron icon with no border/bg, `text-lux-400` → `text-lux-700` on hover
- Widget icon badge (`bg-lux-100`): can stay as-is or get a warm tint — Claude's discretion

### Overall vibe
- Apple design psychology: **subtle, purposeful, never loud**
- Bring it to life with small precise accents (gold bar, segmented tabs, refined timing) — not color overhaul
- Spacing tightened where it feels cramped; generous where it communicates hierarchy
- Every animation should feel like it has physical weight — spring physics for positional changes, ease-out for reveals

### Claude's Discretion
- Whether to keep the `bg-lux-100` secondary pill behind the active icon or replace it entirely with the gold bar
- Exact spring stiffness/damping values for the gold bar animation (maintain existing nav-active-pill as the animated element or add a new one)
- Widget icon badge color treatment (warm/neutral)
- Exact tooltip shape (arrow or no arrow, px values)
- Whether `WideScreenSideRail` (currently unused) is touched — only if it's part of an active layout path

</decisions>

<specifics>
## Specific Ideas

- "Apple design psychology — not overkill with colours, just bring it to life with subtle small accents"
- Gold left bar = classic macOS sidebar (Finder sidebar, VS Code activity bar) — the user recognises this pattern immediately
- iOS segmented control for sidecar tabs — the user cited Apple polish as the reference
- Tooltip: think macOS system tooltip — calm, white-ish, soft border, appears with a short delay

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DockBar.tsx`: Already uses Framer Motion `LayoutGroup` with `layoutId="nav-active-pill"` — the gold bar should be a new `layoutId` (e.g. `"nav-gold-bar"`) sharing the same LayoutGroup, or the existing pill repurposed
- `tailwind.config.js`: `lux-gold: '#B8860B'` token ready to use. Existing keyframes: `lux-fade-in`, `lux-slide-up`, many others. `shadow-xs`, `shadow-soft`, `shadow-glass-lg` already defined
- `SidecarWidgets.tsx`: Uses `grid-rows-[0fr]/[1fr]` CSS grid trick for accordion — just needs `ease-out` and slightly longer duration
- `SidecarView.tsx`: Tab state already managed in component state — only the visual rendering needs to change

### Established Patterns
- Framer Motion spring: `{ type: 'spring', stiffness: 400, damping: 30 }` — used in DockBar active pill, should be consistent
- Tailwind `transition-colors duration-150` is the standard for hover color changes
- `focus-visible:ring-2 focus-visible:ring-lux-gold/30` is already the focus ring pattern everywhere — don't change it

### Integration Points
- `DockBar.tsx` renders the `LayoutGroup` — any animated positional element (gold bar) must live inside it
- `SidecarWidgets.tsx` is self-contained — changes stay in that file
- `SidecarView.tsx` tab state and tab button rendering — reskin only, no state changes
- No backend or shared schema changes — this is purely `src/components/navigation/` and `src/components/sidecar/`

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope (navigation and sidecar widget only)

</deferred>

---

*Phase: Polish-1-design-foundation-and-navigation-polish*
*Context gathered: 2026-03-02*
