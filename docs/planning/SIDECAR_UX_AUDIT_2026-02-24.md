# Sidecar UX Audit (2026-02-24)

## Scope

Validated Supplier Engine behavior in both:

1. Overview mode (`/route`)
2. Sidecar mode (`/route?mode=sidecar`)

Routes audited:

- `/`
- `/buy-box`
- `/inventory`
- `/sourcing`
- `/jobs`
- `/invoices`

## Route Status Matrix

| Route | Overview | Sidecar | Notes |
| ----- | -------- | ------- | ----- |
| `/` | Pass | Pass | Sidecar shows compact Quick Check surface |
| `/buy-box` | Pass | Pass | Sidecar uses `QuickCheck` component |
| `/inventory` | Fail (before fix) | Fail (before fix) | Runtime crash: `isClearing is not defined` |
| `/sourcing` | Pass | Pass | Renders in compact shell, no blocker observed |
| `/jobs` | Pass | Pass | Renders in compact shell, no blocker observed |
| `/invoices` | Pass | Pass | Functional, but not explicitly compact-optimized |

## Findings (Prioritized)

### P0 (Fixed): Inventory runtime crash

- Symptom: inventory route fails with error boundary.
- Error: `ReferenceError: isClearing is not defined`.
- Fix applied: added missing local state in `src/pages/Inventory/InventoryView.tsx`.

### P1: Inventory is not mode-adaptive yet

- `InventoryView` does not currently branch on `useLayoutMode()` for sidecar-specific density or control simplification.
- Current sidecar behavior relies on shell width only, which works but is not optimized for rapid decision support.

### P1: Invoices is not mode-adaptive yet

- `InvoicesView` does not currently use `useLayoutMode()` to simplify form density, panel behavior, or action placement in narrow viewport mode.

### P2: Sidecar navigation coverage trade-off

- `SidecarNav` currently prioritizes Home, Price Check, Inventory, Serial, Invoices.
- Sourcing and Jobs are omitted intentionally for compactness, but this can slow some sourcing-first workflows.

### P2: Sidecar quality is not covered by automated tests

- No direct `?mode=sidecar` assertions are present in current e2e test coverage.

## Recommendations

1. Add explicit `isSidecar` UI variants in:
   - `src/pages/Inventory/InventoryView.tsx`
   - `src/pages/Invoices/InvoicesView.tsx`
2. Keep decision-first hierarchy in sidecar:
   - Search/input at top
   - Primary action pinned/always visible
   - Secondary/advanced controls collapsed
3. Add sidecar-specific smoke tests for:
   - `/buy-box?mode=sidecar`
   - `/inventory?mode=sidecar`
   - `/invoices?mode=sidecar`
4. Revisit `SidecarNav` item set after user testing of sourcing-heavy journeys.

## Acceptance Criteria for Sidecar Hardening

1. No runtime errors on audited sidecar routes.
2. Inventory and Invoices can complete core actions without horizontal overflow at 300-420 px width.
3. Key sidecar flows are covered by automated smoke checks.
