# Luxselle Supplier Engine — Agent Team Architecture

This document defines the page-specialized agent team for the Supplier Engine product direction.

## Product Direction

The app operates in two adaptive modes:

1. **Overview mode**: full dashboard experience for planning and operations.
2. **Sidecar mode**: compact companion panel while browsing external supplier websites.

Core decision loop:

1. Run **Price Check** (market price + max buy + landed cost).
2. Cross-check **Inventory** (stock and sell-through context).
3. Decide whether to **source** or skip.
4. Keep **Invoicing** as post-purchase operational output.

## Agent Team Overview

| Agent | Page | Route | Primary Focus |
| ----- | ---- | ----- | ------------- |
| **Dashboard Agent** | Dashboard | `/` | KPIs, activity, command bar, mode-aware overview |
| **Inventory Agent** | Inventory | `/inventory` | Products, drawer, transactions, stock awareness |
| **Evaluator Agent** | Sourcing Intelligence | `/evaluate` | Market price check, landed cost, decision support |
| **Sourcing Agent** | Sourcing | `/sourcing` | Sourcing requests, status flow, pipeline |
| **Jobs Agent** | Jobs | `/jobs` | System jobs, import status, retries |
| **Invoices Agent** | Invoices | `/invoices` | Invoices list, creation, export |
| **Coordinator Agent** | Cross-page | — | Multi-page flow continuity and mode consistency |

## QA + Documentation Swarm

| Agent | Role | Primary Outputs |
| ----- | ---- | --------------- |
| **Quality Lead Agent** | Orchestrates QA and docs work | Readiness verdict, blocker list, fix backlog |
| **Backend Contracts QA Agent** | Validates API contracts and deterministic logic | Test findings, missing coverage list |
| **Frontend Flows QA Agent** | Verifies loading/error/empty states and key journeys | Flow pass/fail checklist, regression notes |
| **Data Pipeline QA Agent** | Validates supplier ingestion and cron readiness | Pipeline readiness status, operational risks |
| **Docs Improvement Agent** | Keeps docs and runbooks aligned with code | Updated docs, exact commands, open questions |

Recommended order:

1. Quality Lead defines gates.
2. Backend + Frontend + Data Pipeline QA run in parallel.
3. Docs Improvement updates operator guidance.
4. Quality Lead publishes final go/no-go summary.

## Jarvis Behaviors (Supplier Engine)

Target behavior quality across agents:

1. **Predictive**: surface low-stock or margin risks before user asks.
2. **Contextual**: adapt recommendations to current page + mode (Overview/Sidecar).
3. **Cross-page**: tie Evaluator findings to Inventory and Sourcing decisions.
4. **Actionable**: prioritize one-click next actions over passive reporting.

## API Focus by Domain

- **Dashboard**: `/api/dashboard/*` KPI, activity, status, digest-style insights.
- **Evaluator**: `/api/pricing/*` analysis, market context, landed-cost math.
- **Inventory**: `/api/products/*` products, media, transactions, stock status.
- **Sourcing**: `/api/sourcing/*` request lifecycle and transition validation.
- **Jobs**: `/api/jobs/*` import/retry visibility.
- **Invoices**: `/api/invoices/*` invoice listing and creation/export flows.

## UX/UI Agent Skills

Specialist agents for UX audits, design intelligence, and guided design partnership (aligned with Nielsen/Norman heuristics, WCAG, and the lux design system):

| Agent | Role | Primary Outputs |
| ----- | ---- | --------------- |
| **UX Accessibility Auditor** | Heuristic + WCAG audits on `src/` | Structured report, severity findings, actionable recommendations |
| **Design Intelligence** | Visual/UI upgrades grounded in lux tokens | Layout and style proposals, Tailwind/CSS snippets using design system |
| **UX Design Partner** | Wireframes, flows, information architecture | Flow descriptions, IA outlines, handoff notes for implementation |

Cursor rules (auto-load when editing matching paths):

- `ux-accessibility.mdc` — Accessibility checks (contrast, focus, labels, keyboard; toasts over alert).
- `ux-design-system.mdc` — Design system adherence (lux colors, typography, spacing, existing components).

Claude Code agents (same roles) live in `.claude/agents/`: `ux-accessibility-auditor.md`, `ux-design-intelligence.md`, `ux-design-partner.md`.

## GSD Management Agents

Use the GSD management layer for scoped planning and execution:

- `gsd-project-researcher`
- `gsd-roadmapper`
- `gsd-planner`
- `gsd-plan-checker`
- `gsd-executor`
- `gsd-verifier`
- `gsd-integration-checker`

## How to Invoke

Examples:

- "Use the Evaluator agent to improve landed-cost clarity in sidecar mode."
- "Use the Inventory agent to improve low-stock filtering and quick actions."
- "Use the Coordinator agent to improve Evaluator → Inventory → Invoices handoff."
- "Use Quality Lead to run release readiness on this branch."

For GSD framework sync and health:

- `npm run gsd:sync`
- `npm run gsd:health`

## Cursor Cloud specific instructions

### Architecture overview

NPM workspaces monorepo with three services for local dev:

| Service | Command | Port | Notes |
| --------- | --------- | ------ | ------- |
| Firebase emulators (Firestore + Storage) | `npm run emulators` | 8082 / 9198 | Requires Java (JRE 11+) |
| Express backend | `npm run dev --workspace=@luxselle/server` | 3001 | Uses `tsx watch` for hot reload |
| Vite frontend | `npm run dev:client` | 5173 | Proxies `/api` → `localhost:3001` |

All three start together with `npm run dev` (uses `concurrently`).

### Critical: environment variable override for emulator mode

Cursor Cloud injects secrets as shell environment variables (e.g. `FIREBASE_USE_EMULATOR=false`, `AI_ROUTING_MODE=openai`). The backend's `dotenv.config()` does **not** override existing env vars, so injected secrets take precedence over `.env`. To use Firebase emulators locally, you **must** export overrides before starting the backend:

```bash
export FIREBASE_USE_EMULATOR=true
export AI_ROUTING_MODE=dynamic
export GOOGLE_APPLICATION_CREDENTIALS_JSON=""
export SUPPLIER_EMAIL_ENABLED=false
```

### Frontend VITE_API_BASE

The injected `VITE_API_BASE` secret points to the production backend. For local dev, clear it so the Vite proxy is used:

```bash
VITE_API_BASE="" npm run dev:client
```

Or: `VITE_API_BASE="" npx vite --config config/vite.config.ts --host 0.0.0.0`

### Seeding data

After emulators and backend are running: `npm run seed`. This populates ~90 products, sourcing requests, and activity data into the emulator Firestore.

### Standard commands (see README.md for full list)

- **Lint/typecheck**: `npm run typecheck`
- **Unit tests**: `npm run test` (Vitest, 24 test files, 121 tests)
- **E2E tests**: `npm run test:e2e` (auto-installs Chromium; Playwright webServer uses `npm run dev:e2e`)
- **Build**: `npm run build`

### Cloud image optimization prompt

To reduce repeated setup across fresh cloud agents, run an env setup agent with:

```text
Preinstall Playwright Chromium in the cloud image/startup (`npx playwright install chromium`) so `npm run test:e2e` works out-of-the-box.
```

### Server .env symlink

The backend runs via npm workspace which sets CWD to `packages/server/`. A symlink `packages/server/.env -> ../../.env` ensures `dotenv.config()` finds the root `.env` when env vars aren't injected. However, when Cursor Cloud injects secrets, the symlink is moot since shell env vars take precedence — always use the explicit exports above.
