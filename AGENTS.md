# Luxselle Dashboard — Agent Team

A team of page-specific Cursor agents for improving UX, flow, and capabilities per dashboard page. See [docs/planning/AGENT_TEAM.md](docs/planning/AGENT_TEAM.md) for full API specs and Jarvis vision.

## How to Invoke Agents

### Option 1: Open a page file (rule auto-loads)
When you open a file in a page folder (e.g. `src/pages/Dashboard/DashboardView.tsx`), the corresponding page rule loads automatically with scope, APIs, and Jarvis behaviours.

### Option 2: Ask Agent to use an agent
In Cursor Chat, ask the Agent to use a specific subagent:

- "Use the Dashboard agent to improve the low-stock alert UX"
- "Use the Inventory agent to add filtering by low stock"
- "Use the Evaluator agent to improve the add-to-buy-list flow"
- "Use the Quality Lead agent to run a release readiness check"
- "Use the Backend Contracts QA agent to validate API compatibility"
- "Use the Docs Improvement agent to sync deployment docs with code"

### Option 3: Invoke by task description
The main Agent delegates to subagents when it detects a task that matches an agent's description. Example prompts:

- "Improve the Dashboard low-stock alert UX" → agent-dashboard
- "Make the low-stock KPI clickable to go to inventory" → agent-dashboard
- "Add filtering by low stock to the inventory page" → agent-inventory
- "Improve the Evaluator add-to-buy-list one-tap UX" → agent-evaluator
- "Improve cross-page flow from Evaluator to Buy list to Receive" → agent-coordinator
- "Run QA on supplier email ingestion and landed-cost math" → agent-quality-lead
- "Audit backend endpoint tests for new pricing/supplier routes" → agent-qa-backend-contracts
- "Document production rollout and missing inputs" → agent-docs-improvement

## Agent Index

| Page | Route | Agent File | When to Use |
|------|-------|------------|-------------|
| Dashboard | `/` | agent-dashboard | KPIs, activity feed, command bar, low-stock alerts |
| Inventory | `/inventory` | agent-inventory | Products, drawer, transactions, filters |
| Evaluator | `/buy-box` | agent-evaluator | Pricing analysis, add-to-buy-list |
| Supplier Hub | `/supplier-hub` | agent-supplier-hub | Suppliers, CSV import, feed |
| Sourcing | `/sourcing` | agent-sourcing | Sourcing requests, status flow, pipeline |
| Buying List | `/buying-list` | agent-buying-list | Buy list items, receive flow, messages |
| Jobs | `/jobs` | agent-jobs | System jobs, import status, retries |
| Invoices | `/invoices` | agent-invoices | Invoices list, creation, PDF |
| Coordinator | — | agent-coordinator | Cross-page flows, unified intelligence |

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
