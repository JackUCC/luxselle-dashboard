# Luxselle Supplier Engine — Agent Team

A team of page-specific Cursor agents for improving UX, flow, and capabilities per page. The app operates in two modes: **Overview** (full dashboard) and **Sidecar** (compact panel for use alongside supplier websites). See [docs/planning/AGENT_TEAM.md](docs/planning/AGENT_TEAM.md) for full API specs.

## How to Invoke Agents

### Option 1: Open a page file (rule auto-loads)
When you open a file in a page folder (e.g. `src/pages/Dashboard/DashboardView.tsx`), the corresponding page rule loads automatically with scope, APIs, and Jarvis behaviours.

### Option 2: Ask Agent to use an agent
In Cursor Chat, ask the Agent to use a specific subagent:

- "Use the Dashboard agent to improve the low-stock alert UX"
- "Use the Inventory agent to add filtering by low stock"
- "Use the Evaluator agent to improve market-price and landed-cost decision UX"
- "Use the Quality Lead agent to run a release readiness check"
- "Use the Backend Contracts QA agent to validate API compatibility"
- "Use the Docs Improvement agent to sync deployment docs with code"

### Option 3: Invoke by task description
The main Agent delegates to subagents when it detects a task that matches an agent's description. Example prompts:

- "Improve the Dashboard low-stock alert UX" → agent-dashboard
- "Make the low-stock KPI clickable to go to inventory" → agent-dashboard
- "Add filtering by low stock to the inventory page" → agent-inventory
- "Improve the Evaluator market-check one-tap UX" → agent-evaluator
- "Improve cross-page flow from Evaluator to Inventory to Invoices" → agent-coordinator
- "Run QA on supplier email ingestion and landed-cost math" → agent-quality-lead
- "Audit backend endpoint tests for new pricing/supplier routes" → agent-qa-backend-contracts
- "Document production rollout and missing inputs" → agent-docs-improvement
- "Run a UX/accessibility audit on the app" → agent-ux-accessibility-auditor
- "Propose a visual redesign using our design system" → agent-ux-design-intelligence
- "Help rethink the Evaluator → Inventory flow" → agent-ux-design-partner

## Agent Index

| Page | Route | Agent File | When to Use |
|------|-------|------------|-------------|
| Dashboard | `/` | agent-dashboard | KPIs, activity feed, command bar, low-stock alerts |
| Inventory | `/inventory` | agent-inventory | Products, drawer, transactions, filters |
| Evaluator | `/evaluate` | agent-evaluator | Pricing analysis, market price, landed cost |
| Sourcing | `/sourcing` | agent-sourcing | Sourcing requests, status flow, pipeline |
| Jobs | `/jobs` | agent-jobs | System jobs, import status, retries |
| Invoices | `/invoices` | agent-invoices | Invoices list, creation, PDF |
| Coordinator | — | agent-coordinator | Cross-page flows, unified intelligence |

## UX/UI Agent Index

| Agent | Agent File | When to Use |
|------|------------|-------------|
| UX Accessibility Auditor | agent-ux-accessibility-auditor | Heuristic + WCAG audits, before redesigns |
| Design Intelligence | agent-ux-design-intelligence | Visual/UI upgrades, design system–grounded proposals |
| UX Design Partner | agent-ux-design-partner | Wireframes, flows, IA, guided design decisions |

## QA/Docs Agent Index

| Agent | Agent File | When to Use |
|------|------------|-------------|
| Quality Lead | agent-quality-lead | Orchestrate test/doc/release-readiness checks |
| Backend Contracts QA | agent-qa-backend-contracts | Validate API contracts, schemas, service logic |
| Frontend Flows QA | agent-qa-frontend-flows | Validate UI flows and regressions |
| Data Pipeline QA | agent-qa-data-pipeline | Validate Gmail import pipeline and cron readiness |
| Docs Improvement | agent-docs-improvement | Keep docs/runbooks/deploy guidance aligned |

## Agent Files Location

- Subagents: `.cursor/agents/agent-*.md`, plus generic `qa.md`, `docs.md`, `backend.md`, `frontend.md`
- Page and quality rules: `.cursor/rules/agent-*.mdc` (auto-load by file scope)
- UX rules: `.cursor/rules/ux-accessibility.mdc`, `.cursor/rules/ux-design-system.mdc` (auto-load when editing `src/`, Tailwind, or global styles)

## GSD Framework (Project Management)

The Get Shit Done framework is installed in both `.claude/` and Cursor-native paths:

- GSD agents: `.cursor/agents/gsd-*.md`
- GSD commands: `.cursor/commands/gsd/*.md`
- GSD templates: `.cursor/templates/**`
- GSD workflows: `.cursor/workflows/gsd/*.md`

Run these from repository root:

- `npm run gsd:sync` to sync/update Cursor GSD assets from `.claude`
- `npm run gsd:health` for framework health checks
- `npm run gsd:quick` for rapid project planning scaffolding

## Full Specs

See [docs/planning/AGENT_TEAM.md](docs/planning/AGENT_TEAM.md) for:

- Per-page current APIs and next-level APIs
- Jarvis behaviours (proactive, predictive, preemptive)
- Cross-cutting unified intelligence layer
- Testing strategy for agent work
- QA + documentation orchestration flow

See [docs/planning/QA_SWARM_PLAYBOOK.md](docs/planning/QA_SWARM_PLAYBOOK.md) for:
- QA swarm invocation prompts
- Quality gates and default command set
- Standard readiness report format

See [docs/planning/DEPLOYMENT_CHECKER_PLAYBOOK.md](docs/planning/DEPLOYMENT_CHECKER_PLAYBOOK.md) for:
- Deployment checker agents (Vercel, Railway, Firebase)
- Review and Fix Coordinator workflow
- Output formats and fix prioritization

## Cursor Cloud specific instructions

### Architecture overview

NPM workspaces monorepo with three services for local dev:

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Firebase emulators (Firestore + Storage) | `npm run emulators` | 8082 / 9198 | Requires Java (JRE 11+) |
| Express backend | `npm run dev --workspace=@luxselle/server` | 3001 | Uses `tsx watch` for hot reload |
| Vite frontend | `npm run dev:client` | 5173 | Proxies `/api` → `localhost:3001` |

All three start together with `npm run dev` (uses `concurrently`).

### Critical: environment variable override for emulator mode

Cursor Cloud injects secrets as shell environment variables (e.g. `FIREBASE_USE_EMULATOR=false`, `AI_PROVIDER=openai`). The backend's `dotenv.config()` does **not** override existing env vars, so injected secrets take precedence over `.env`. To use Firebase emulators locally, you **must** export overrides before starting the backend:

```bash
export FIREBASE_USE_EMULATOR=true
export AI_PROVIDER=mock
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
