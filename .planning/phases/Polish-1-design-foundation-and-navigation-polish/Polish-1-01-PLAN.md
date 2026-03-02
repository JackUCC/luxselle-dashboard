---
phase: Polish-1-design-foundation-and-navigation-polish
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/navigation/DockBar.tsx
  - src/components/navigation/SidecarNav.tsx
  - src/components/sidecar/SidecarView.tsx
  - src/components/sidecar/SidecarWidgets.tsx
autonomous: true
requirements:
  - STYLE-01
  - STYLE-02
must_haves:
  truths:
    - "Overview navigation has unmistakable active state, refined grouping, and smooth hover/click interaction."
    - "Sidecar compact mode is scannable and professional at narrow widths."
    - "All changes remain presentation-only with no business logic modifications."
  artifacts:
    - src/components/navigation/DockBar.tsx
    - src/components/navigation/SidecarNav.tsx
    - src/components/sidecar/SidecarView.tsx
    - src/components/sidecar/SidecarWidgets.tsx
---

<objective>
Execute Phase Polish-1 by upgrading navigation hierarchy and sidecar compact treatment so the UI feels deliberate and demo-ready while preserving existing behavior.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Refine overview dock navigation hierarchy and motion</name>
  <files>src/components/navigation/DockBar.tsx</files>
  <action>Improve active-route clarity with a moving gold indicator, smooth icon interactions, and clearer section grouping/labels.</action>
  <verify>npm run typecheck</verify>
  <done>Active route state and group hierarchy read clearly in overview mode.</done>
</task>

<task type="auto">
  <name>Task 2: Polish sidecar navigation shell and drawer links</name>
  <files>src/components/navigation/SidecarNav.tsx</files>
  <action>Upgrade sidecar top-bar affordances and drawer item states for compact, high-legibility navigation.</action>
  <verify>npm run typecheck</verify>
  <done>Sidecar navigation feels intentional and consistent with overview polish.</done>
</task>

<task type="auto">
  <name>Task 3: Apply segmented-control sidecar tabs and cleaner widget cards</name>
  <files>src/components/sidecar/SidecarView.tsx, src/components/sidecar/SidecarWidgets.tsx</files>
  <action>Reskin tabs to segmented control behavior, tighten compact spacing, and simplify widget accordion chrome while preserving existing functionality.</action>
  <verify>npm run typecheck</verify>
  <done>Sidecar widgets are scannable and professional at narrow widths.</done>
</task>

</tasks>

<verification>
- [x] `npm run typecheck`
- [ ] `npm run test` (blocked by sandbox `EPERM` for server test listeners)
- [ ] Manual smoke in overview + `?mode=sidecar`
</verification>

<success_criteria>
- STYLE-01 complete.
- STYLE-02 complete.
- No logic, data, or API behavior changed.
</success_criteria>
