# Phase 8: Jobs and Activity Visibility - Research

**Researched:** 2026-03-01
**Domain:** React Router v6 route registration, Tailwind CSS component patterns, Vitest backend route testing
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OPS-02 | Jobs monitoring surfaces failures and supports retries | JobsView.tsx is fully implemented with GET /api/jobs and POST /api/jobs/:id/retry — only routing registration blocks access |
| DATA-03 | Import status visible in jobs and activity surfaces | GET /api/dashboard/activity is fully implemented — only frontend consumer is missing |
</phase_requirements>

---

## Summary

This phase closes two navigation gaps identified in the v1.0 milestone audit. Both gaps are wiring-only: the backend is complete and the Jobs UI component is complete. No new logic needs to be written.

**Gap 1 (OPS-02):** `src/pages/Jobs/JobsView.tsx` exists with correct API wiring (GET `/api/jobs`, POST `/api/jobs/:id/retry`, detail drawer, status filtering, progress bars, error log). It is absent from `AnimatedRoutes.tsx` (no route entry), `routeMeta.ts` (no `appRoutes[]` entry), and therefore does not appear in either `DockBar.tsx` or `MobileNavDrawer.tsx`. Adding the route and the `appRoutes` entry is the entire fix — no changes to JobsView itself are required.

**Gap 2 (DATA-03):** `GET /api/dashboard/activity` exists in `packages/server/src/routes/dashboard.ts` (line 67). It returns `{ data: ActivityEvent[] }` sorted by `createdAt` desc, with a default limit of 20. `ActivityEventRepo` writes events during supplier import operations. No frontend component fetches this endpoint. The right placement for an activity feed is the Dashboard page, which already loads KPIs and profit-summary — adding an activity section there is the minimal, coherent fix.

**Primary recommendation:** Register `/jobs` in three files (AnimatedRoutes, routeMeta appRoutes, done — DockBar and MobileNavDrawer auto-derive from appRoutes), then add an ActivityFeed section to DashboardView that calls GET `/api/dashboard/activity`.

---

## Standard Stack

### Core (already in use — no new installs)

| Library | Version in use | Purpose | Why Standard |
|---------|----------------|---------|--------------|
| React Router v6 | installed | Route registration via `useRoutes` | Project standard; AnimatedRoutes uses it |
| lucide-react | installed | Nav icons | All nav routes use lucide icons |
| Tailwind CSS | installed | Styling | Project standard |
| Vitest + Supertest | installed | Backend route tests | All 12 existing route tests use this pattern |
| Playwright | installed | E2E navigation tests | Existing shell tests cover nav registration |

**Installation:** No new packages required.

---

## Architecture Patterns

### Navigation Registration Flow

The nav system is data-driven: everything derives from `appRoutes[]` in `routeMeta.ts`.

```
routeMeta.ts appRoutes[]
    ↓
DockBar.tsx        — filters appRoutes by section, renders nav icons
MobileNavDrawer.tsx — filters appRoutes by section, renders nav links
LuxselleApp.tsx    — calls getRouteMeta(pathname) for mobile page title
AnimatedRoutes.tsx — maps paths to lazy-loaded page components
```

Adding `/jobs` to `appRoutes[]` with `section: 'manage'` automatically makes it appear in both DockBar and MobileNavDrawer. No changes to those components are needed.

### Pattern 1: Adding a Route to the System (verified from source)

**Step A — routeMeta.ts:** Add entry to `appRoutes[]`.

```typescript
// Source: src/components/layout/routeMeta.ts (verified)
// Add after the /invoices entry, same section: 'manage'
import { Briefcase } from 'lucide-react'  // or another available icon

{ path: '/jobs', label: 'Jobs', navLabel: 'Jobs', icon: Briefcase, section: 'manage' },
```

Note: `AppNavSection` is typed as `'check' | 'manage'`. Jobs belongs in `'manage'` alongside Inventory, Sourcing, and Invoices.

**Step B — AnimatedRoutes.tsx:** Add lazy import and route entry.

```typescript
// Source: src/components/layout/AnimatedRoutes.tsx (verified)
const JobsView = lazy(() => import('../../pages/Jobs/JobsView'))

// Add to routes array:
{ path: '/jobs', element: <JobsView /> },
```

The lazy pattern matches all existing routes exactly. No Suspense or ErrorBoundary changes needed — they wrap AnimatedRoutes at the LuxselleApp level.

### Pattern 2: Existing Page Data Fetching (manual useEffect + apiGet)

```typescript
// Source: src/pages/Dashboard/DashboardView.tsx (verified)
// Existing pattern — reuse for activity fetch:
const [activities, setActivities] = useState<ActivityEvent[]>([])

useEffect(() => {
  apiGet<{ data: ActivityEvent[] }>('/dashboard/activity?limit=20')
    .then(res => setActivities(res.data))
    .catch(() => {/* handle */})
}, [])
```

CLAUDE.md: "Server state: manual useEffect + apiGet + useState per page."

### Pattern 3: DashboardView Activity Section Placement

DashboardView currently renders 4 BentoGrid rows. The activity feed should be added as a new section below the existing rows, not as a BentoGrid widget — activity is a vertical list, not a fixed-height bento cell.

Use the same `lux-card` + `SectionLabel` pattern that JobsView uses internally:

```tsx
// Pattern from JobsView.tsx (verified) — consistent lux-card style
<div className="lux-card p-5 space-y-3">
  <SectionLabel>Recent Activity</SectionLabel>
  {activities.map(event => (
    <div key={event.entityId} className="flex items-start gap-3 text-sm text-lux-700">
      ...
    </div>
  ))}
</div>
```

### ActivityEvent Data Shape (verified from shared schema)

```typescript
// Source: packages/shared/src/schemas/activityEvent.ts (verified)
type ActivityEvent = {
  organisationId: string
  createdAt: string       // ISO string, sort key
  updatedAt: string
  actor: string           // who triggered it
  eventType: string       // e.g. 'import_started', 'import_completed'
  entityType: string      // e.g. 'supplier', 'product'
  entityId: string
  payload: Record<string, any>
}
```

GET `/api/dashboard/activity` returns `{ data: ActivityEvent[] }` — sorted by `createdAt` desc, default limit 20. Optional `?limit=N` param supported.

### Pattern 4: Recommended Project Structure Changes

```
src/
├── components/
│   └── layout/
│       ├── AnimatedRoutes.tsx   EDIT: add JobsView lazy import + route
│       └── routeMeta.ts         EDIT: add /jobs to appRoutes[]
├── pages/
│   ├── Jobs/
│   │   └── JobsView.tsx         NO CHANGES NEEDED
│   └── Dashboard/
│       └── DashboardView.tsx    EDIT: add activity section
```

### Anti-Patterns to Avoid

- **Modifying DockBar or MobileNavDrawer directly:** Both components read from `appRoutes[]` automatically. Hardcoding `/jobs` into them would duplicate data and drift out of sync.
- **Creating a standalone ActivityView page:** The audit gap is that activity data is produced but not surfaced. The Dashboard is the correct home — it already has operational health context (OPS-03).
- **Building an ActivityEventRepo on the frontend:** The backend already handles all fetching via GET `/api/dashboard/activity`. Use `apiGet`.
- **Adding /jobs to the `'check'` section:** It belongs in `'manage'` (alongside Inventory, Sourcing, Invoices). Operational monitoring is not a "check" tool.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Activity event sorting/limiting | Custom sort in frontend | Backend does it (createdAt desc, limit param) | Backend already sorts; avoid duplicated logic |
| Route lazy-loading setup | Custom Suspense wrapper | Use existing `lazy()` pattern in AnimatedRoutes | Existing Suspense in LuxselleApp covers all routes |
| Nav rendering for /jobs | Nav component edits | Add to appRoutes[] only | DockBar and MobileNavDrawer derive from appRoutes automatically |
| Job status icons | Custom SVG or inline icons | Lucide icons (already imported in JobsView) | Already implemented and consistent |

**Key insight:** This phase is entirely wiring. Both pages' logic (JobsView) and data (dashboard/activity endpoint) exist. The only work is connecting them to the routing and navigation system.

---

## Common Pitfalls

### Pitfall 1: Editing Nav Components Instead of routeMeta
**What goes wrong:** Developer adds a NavLink for `/jobs` directly in DockBar.tsx or MobileNavDrawer.tsx.
**Why it happens:** Seems like the direct path to add a nav entry.
**How to avoid:** Always add to `appRoutes[]` in routeMeta.ts — both nav components filter from that array.
**Warning signs:** If you find yourself editing DockBar.tsx or MobileNavDrawer.tsx to add /jobs, stop.

### Pitfall 2: Forgetting the Lazy Import in AnimatedRoutes
**What goes wrong:** Route entry added but no `lazy()` import added — bundle fails or shows blank page.
**Why it happens:** Routes array and imports are separate lines in AnimatedRoutes.tsx.
**How to avoid:** Add both the `const JobsView = lazy(() => ...)` import AND the route entry at the same time.
**Warning signs:** TypeScript error on `JobsView` usage, or blank page at `/jobs`.

### Pitfall 3: Missing Icon Import in routeMeta
**What goes wrong:** `import { Briefcase }` missing from `lucide-react` import line in routeMeta.ts.
**Why it happens:** routeMeta.ts has a specific import block at the top — easy to miss when adding.
**How to avoid:** Check the existing import block and add the icon to the same line.
**Warning signs:** TypeScript error "Module has no exported member 'X'" or icon renders as undefined.

### Pitfall 4: ActivityEvent has no stable `id` field for React keys
**What goes wrong:** Using `event.entityId` as the React key — multiple events for the same entity share the same entityId.
**Why it happens:** ActivityEvent extends BaseDocSchema which has no `id` field — Firestore doc IDs are added by BaseRepo at read time.
**How to avoid:** Check whether ActivityEventRepo.list() adds an `id` field (BaseRepo pattern). Use `event.createdAt + event.entityId` as fallback key if no id.
**Warning signs:** React console warning about duplicate keys.

### Pitfall 5: DashboardView isSidecar guard
**What goes wrong:** Activity section added but not visible in sidecar mode because DashboardView returns `<SidecarView />` early when `isSidecar === true`.
**Why it happens:** DashboardView has an early return at line 58: `if (isSidecar) return <SidecarView />`
**How to avoid:** The activity section only needs to work in overview mode. This is correct behavior — no fix needed, just be aware that the section will not appear in sidecar.
**Warning signs:** If you navigate to `/jobs?mode=sidecar`, JobsView should render (it has no sidecar guard), but `/jobs` navigation from sidecar mode may redirect back to sidecar view — test this.

---

## Code Examples

### Route Registration (complete diff)

```typescript
// AnimatedRoutes.tsx — add these two lines
// Source: src/components/layout/AnimatedRoutes.tsx (verified pattern)

// Add with other lazy imports (top of file):
const JobsView = lazy(() => import('../../pages/Jobs/JobsView'))

// Add to routes array:
{ path: '/jobs', element: <JobsView /> },
```

### routeMeta.ts Entry (complete diff)

```typescript
// Source: src/components/layout/routeMeta.ts (verified pattern)

// Add to lucide-react import:
import { Briefcase, ... } from 'lucide-react'

// Add to appRoutes[] — after /invoices (last 'manage' entry):
{ path: '/jobs', label: 'Jobs', navLabel: 'Jobs', icon: Briefcase, section: 'manage' },
```

### Activity Fetch in DashboardView

```typescript
// Source pattern: DashboardView.tsx loadData() + apiGet (verified)
import type { ActivityEvent } from '@shared/schemas'

const [activities, setActivities] = useState<ActivityEvent[]>([])

// Inside loadData(), extend the Promise.all:
const [kpisRes, profitRes, activityRes] = await Promise.all([
  apiGet<{ data: KPIs }>('/dashboard/kpis'),
  apiGet<{ data: ProfitSummary }>('/dashboard/profit-summary'),
  apiGet<{ data: ActivityEvent[] }>('/dashboard/activity?limit=10'),
])
setActivities(activityRes.data)
```

### dashboard.test.ts — activity endpoint test pattern

```typescript
// Source: packages/server/src/routes/dashboard.test.ts (verified vi.hoisted pattern)
const { mockActivityList } = vi.hoisted(() => ({
  mockActivityList: vi.fn(),
}))
vi.mock('../repos/ActivityEventRepo', () => ({
  ActivityEventRepo: class { list = mockActivityList },
}))

describe('GET /api/dashboard/activity', () => {
  it('returns 200 with data array', async () => {
    mockActivityList.mockResolvedValue([])
    const res = await request(app).get('/api/dashboard/activity')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('limits and sorts events by createdAt desc', async () => {
    mockActivityList.mockResolvedValue([
      { createdAt: '2026-01-01T10:00:00Z', eventType: 'old', ... },
      { createdAt: '2026-01-02T10:00:00Z', eventType: 'new', ... },
    ])
    const res = await request(app).get('/api/dashboard/activity?limit=1')
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].eventType).toBe('new')
  })
})
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| n/a (new phase) | Route registration via appRoutes[] data-driven nav | Established in earlier phases | Adding /jobs requires only routeMeta.ts + AnimatedRoutes.tsx |

**Not deprecated:** Everything in this phase uses the established patterns from phases 1-7. No framework upgrades, no library changes needed.

---

## Open Questions

1. **Does BaseRepo.list() return an `id` field on ActivityEvent records?**
   - What we know: BaseRepo exists and all repos extend it; SystemJobRepo clearly adds `id` (JobsView uses `job.id`)
   - What's unclear: Whether the `id` field is on the Zod schema type or just added at runtime by BaseRepo
   - Recommendation: Check `packages/server/src/repos/BaseRepo.ts` during implementation; if id is not on the schema type, use `(event as ActivityEvent & { id: string }).id` or concatenate `createdAt + entityId` for React keys.

2. **Does the `/jobs` route need a `deepStateRule` in routeMeta.ts?**
   - What we know: JobsView uses `?job=` and `?status=` search params; DeepStateBreadcrumb shows crumbs for routes with deepStateRules
   - What's unclear: Whether showing crumbs on /jobs?job=XYZ is desirable UX
   - Recommendation: Low priority — omit deepStateRule for now, add if needed post-ship.

3. **Should `/jobs` be reachable in sidecar mode?**
   - What we know: JobsView has no isSidecar guard, so it would render normally at `/jobs?mode=sidecar`; the sidecar mode preservation in LuxselleApp.tsx would add `mode=sidecar` to `/jobs` navigation
   - What's unclear: Whether a Jobs monitor view makes sense in compact sidecar layout
   - Recommendation: No special handling needed. JobsView uses `PageLayout variant="default"` which is the correct layout. Let sidecar mode preserve as-is — the Jobs table is scrollable and functional at any width.

---

## Validation Architecture

> nyquist_validation key not found in .planning/config.json — skipping Validation Architecture section per instructions.

The config.json has `"workflow": { "research": true, "plan_check": true, "verifier": true }` but no `nyquist_validation` key. Including test mapping here for planner convenience regardless.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (config at `config/vitest.config.ts`) |
| Config file | `config/vitest.config.ts` |
| Quick run command | `npm test` |
| E2E command | `npm run test:e2e` |

### Phase Requirements Test Map

| Req ID | Behavior | Test Type | File | Exists? |
|--------|----------|-----------|------|---------|
| OPS-02 | GET /jobs route returns jobs | unit | `packages/server/src/routes/jobs.test.ts` | YES (existing: GET /api/jobs, GET /api/jobs/:id) |
| OPS-02 | POST /jobs/:id/retry queues job | unit | `packages/server/src/routes/jobs.test.ts` | NO — retry path not tested yet |
| OPS-02 | /jobs route renders in app nav | e2e | `tests/e2e/dashboard-shell.spec.ts` | NO — needs new test |
| DATA-03 | GET /dashboard/activity returns events | unit | `packages/server/src/routes/dashboard.test.ts` | NO — activity endpoint not tested |
| DATA-03 | Activity feed visible on dashboard | e2e | `tests/e2e/dashboard-shell.spec.ts` | NO — needs new test |

### Wave 0 Gaps
- [ ] `packages/server/src/routes/jobs.test.ts` — add retry path test (POST /api/jobs/:id/retry success + validation)
- [ ] `packages/server/src/routes/dashboard.test.ts` — add GET /api/dashboard/activity test (200 shape + sort order + limit)
- [ ] `tests/e2e/dashboard-shell.spec.ts` — add `/jobs` navigation test (dock and mobile nav) + activity feed visibility test

---

## Sources

### Primary (HIGH confidence)

- `src/pages/Jobs/JobsView.tsx` — complete implementation, no changes needed; uses apiGet('/jobs'), apiPost('/jobs/:id/retry')
- `src/components/layout/AnimatedRoutes.tsx` — exact lazy route registration pattern
- `src/components/layout/routeMeta.ts` — exact appRoutes[] shape: `{ path, label, navLabel, icon, section }`
- `src/components/navigation/navGroups.ts` — NAV_GROUPS: `[{ title: 'Check', section: 'check' }, { title: 'Manage', section: 'manage' }]`
- `src/components/navigation/DockBar.tsx` — derives nav from `appRoutes.filter(r => r.section === group.section)`
- `src/components/navigation/MobileNavDrawer.tsx` — same appRoutes filter pattern
- `packages/server/src/routes/dashboard.ts` — GET /activity at line 67: `activityRepo.list()` sorted by createdAt desc, sliced to limit
- `packages/shared/src/schemas/activityEvent.ts` — ActivityEvent type: `{ actor, eventType, entityType, entityId, payload, createdAt }`
- `packages/shared/src/schemas/systemJob.ts` — SystemJob type with full status lifecycle
- `packages/server/src/routes/jobs.ts` — complete backend: list, getById, retry, cancel
- `packages/server/src/routes/jobs.test.ts` — existing test pattern for jobs routes
- `packages/server/src/routes/dashboard.test.ts` — vi.hoisted + vi.mock pattern for dashboard tests
- `tests/e2e/dashboard-shell.spec.ts` — Playwright nav test patterns (dock-bar, mobile-nav-drawer)
- `.planning/v1.0-MILESTONE-AUDIT.md` — precise gap definitions (source of truth for this phase scope)
- `config/vitest.config.ts` — test includes: server routes, shared schemas, src/lib

### Secondary (MEDIUM confidence)

- CLAUDE.md: "manual useEffect + apiGet + useState per page" — confirmed by DashboardView.tsx source

### Tertiary (LOW confidence)

- None — all findings are direct source code inspection.

---

## Metadata

**Confidence breakdown:**
- Gap definition: HIGH — directly from audit YAML + source code inspection
- JobsView completeness: HIGH — read full file, all API calls present, no stubs
- Activity endpoint shape: HIGH — read dashboard.ts + activityEvent.ts schema
- Nav registration pattern: HIGH — read all four nav files + routeMeta.ts
- Test patterns: HIGH — read jobs.test.ts + dashboard.test.ts + dashboard-shell.spec.ts
- Icon choice (Briefcase): MEDIUM — lucide-react has Briefcase but exact available icons not enumerated; planner should verify or pick an alternative

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable patterns; no fast-moving dependencies)
