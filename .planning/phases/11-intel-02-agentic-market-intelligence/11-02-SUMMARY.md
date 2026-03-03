---
phase: 11-intel-02-agentic-market-intelligence
plan: "02"
subsystem: market-research-ui
tags: [freshness, ui, market-research, staleness, background-refresh]
dependency_graph:
  requires: []
  provides: [freshness-mode-pill, generatedAt-age-text, background-refresh-button, staleness-indicator]
  affects: [MarketResearchView, FreshnessBadge, AiMarketPulseWidget]
tech_stack:
  added: []
  patterns: [formatRelativeDate formatter, isStaleData helper, conditional amber styling]
key_files:
  created: []
  modified:
    - src/pages/MarketResearch/FreshnessBadge.tsx
    - src/pages/MarketResearch/MarketResearchView.tsx
    - src/components/widgets/AiMarketPulseWidget.tsx
decisions:
  - "FreshnessBadge wraps badge and pill in flex container, renders generatedAt text below — minimal layout change"
  - "Mode pill only shown for background/deep_dive (not standard/undefined) per plan spec"
  - "isStaleData threshold set at 60 minutes per plan spec"
metrics:
  duration_minutes: 8
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_modified: 3
---

# Phase 11 Plan 02: Market Intelligence UI Freshness and Background Refresh Summary

FreshnessBadge now shows mode pill and age text; MarketResearchView has a Refresh button calling POST /api/market-research/trigger-monitor; AiMarketPulseWidget shows "Updated X mins ago" or amber "Data may be outdated" footer based on generatedAt age.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Update FreshnessBadge with mode pill + age text; MarketResearchView with Refresh button | e4e5088 (pre-existing Cursor commit) | FreshnessBadge.tsx, MarketResearchView.tsx |
| 2 | Add staleness indicator to AiMarketPulseWidget | 25ef08d | AiMarketPulseWidget.tsx |

## What Was Built

### FreshnessBadge.tsx
- Added `mode` and `generatedAt` optional props to `FreshnessBadgeProps`
- Added `MODE_LABELS` map: `{ background: 'Background run', deep_dive: 'Deep dive' }`
- Wrapped badge in a `flex flex-col items-end gap-0.5` container
- Renders mode pill (bg-lux-100/text-lux-600) only when `mode` is `'background'` or `'deep_dive'`
- Renders `formatRelativeDate(generatedAt)` age text in `text-[10px] text-lux-400` when generatedAt is non-empty

### MarketResearchView.tsx
- Added `isMonitorLoading` state
- Added `handleTriggerMonitor` async function: calls `apiPost('/market-research/trigger-monitor', {...formData})`, shows toast success/error
- Updated FreshnessBadge usage to pass `mode={result.intel?.mode}` and `generatedAt={result.intel?.generatedAt}`
- Added Refresh button with `data-testid="market-research-trigger-monitor"` and History icon after Deep-dive button in headerActions

### AiMarketPulseWidget.tsx
- Imported `formatRelativeDate` from `../../lib/formatters`
- Added `isStaleData(generatedAt)` helper: returns true when age > 60 minutes
- Added footer paragraph below items list: shows "Updated X mins ago" (normal) or amber "Data may be outdated · X hours ago" (stale) when `generatedAt` is set

## Verification

- `npm run typecheck` passes with 0 errors
- `npm test` passes: 241 tests across 41 test files

## Deviations from Plan

### Pre-existing Work Found

**Task 1 was partially completed in a prior Cursor commit (e4e5088 "Market Research: add trigger monitor button and service tests").**

- The prior commit already included: `isMonitorLoading` state, `handleTriggerMonitor` handler, Refresh button in MarketResearchView, and updated FreshnessBadge with mode/generatedAt support.
- All Task 1 artifacts were verified present in HEAD before any new commits.
- Task 2 (AiMarketPulseWidget staleness indicator) was the only net-new work performed in this execution.

No bugs auto-fixed, no architectural changes required.

## Self-Check: PASSED

- `/Users/jackkelleher/luxselle-dashboard/src/pages/MarketResearch/FreshnessBadge.tsx` — contains `mode`, `generatedAt`, `MODE_LABELS`, mode pill rendering
- `/Users/jackkelleher/luxselle-dashboard/src/pages/MarketResearch/MarketResearchView.tsx` — contains `isMonitorLoading`, `handleTriggerMonitor`, `data-testid="market-research-trigger-monitor"`, `mode={result.intel?.mode}`
- `/Users/jackkelleher/luxselle-dashboard/src/components/widgets/AiMarketPulseWidget.tsx` — contains `isStaleData`, `formatRelativeDate`, amber staleness indicator
- Commits verified: `e4e5088` (Task 1), `25ef08d` (Task 2)
