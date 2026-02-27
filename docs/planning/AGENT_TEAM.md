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
| **Evaluator Agent** | Buy Box | `/buy-box` | Market price check, landed cost, decision support |
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
