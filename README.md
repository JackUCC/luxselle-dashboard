# Luxselle Supplier Engine

Supplier decision engine for buying and sourcing luxury goods. Speeds up purchasing decisions with market price checks, landed cost calculations, and live inventory awareness. Two modes: **Overview** (full dashboard) and **Sidecar** (compact panel alongside supplier websites). React + Vite + Tailwind frontend, Express API, Firebase Firestore.

## GSD (Get Shit Done) — Spec-Driven Development

This project uses [GSD](https://github.com/gsd-build/get-shit-done) for milestone/phase planning and task execution.

**Already installed** (locally in `.claude/`). To verify or update:

```bash
npx get-shit-done-cc@latest --claude --local
```

**How GSD works with Cursor agents/rules:** GSD drives *what* to build (`.planning/`, `PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`). The existing Cursor rules in `.cursor/rules/` and agents in `.cursor/agents/` define *how* (patterns, API contracts, UX). When executing GSD phases, open the relevant page files so the correct Cursor rule auto-loads, or invoke agents by name (e.g. "Use the Evaluator agent to ...").

**Workflow:**

```bash
# Map existing codebase (one-time, creates .planning/ context)
# In Claude Code: /gsd:map-codebase

# Start a new milestone
# /gsd:new-milestone

# For each phase: discuss → plan → execute → verify
# /gsd:discuss-phase N → /gsd:plan-phase N → /gsd:execute-phase N → /gsd:verify-work N
```

## Setup

1. **Clone and install**

   ```bash
   git clone <repo-url>
   cd [REDACTED]
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env` in the project root.
   - For local development, defaults in `.env.example` are sufficient for emulator mode.

   | Variable | Purpose |
   |----------|---------|
   | `FIREBASE_USE_EMULATOR` | `true` for local Firestore/Storage emulator |
   | `FIREBASE_PROJECT_ID` | Firebase project ID |
   | `FIREBASE_STORAGE_BUCKET` | Storage bucket name |
   | `FIRESTORE_EMULATOR_HOST` | e.g. `127.0.0.1:8082` (match firebase/firebase.json) |
   | `FIREBASE_STORAGE_EMULATOR_HOST` | e.g. `127.0.0.1:9198` (match firebase/firebase.json) |
   | `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON (leave empty for emulator) |
   | `AI_ROUTING_MODE` | `dynamic` (default) \| `openai` \| `perplexity` |
   | `AI_PROVIDER` (deprecated) | Compatibility input for one release only; scheduled for removal in the next breaking cleanup |
   | `OPENAI_API_KEY` | Enables OpenAI extraction/generation/vision |
   | `PERPLEXITY_API_KEY` | Enables Perplexity web retrieval/extraction |
   | `BASE_CURRENCY` | e.g. `EUR` (used by pricing) |
   | `TARGET_MARGIN_PCT` | Default margin % (e.g. `35`) |
   | `PORT` | Backend port (default `3001`) |
   | `VITE_FIREBASE_PROJECT_ID` | Frontend Firebase project ID |
   | `VITE_FIREBASE_STORAGE_BUCKET` | Frontend storage bucket |

3. **Seed data (optional)**
   - Run after emulator and server are available (e.g. after first `npm run dev`).

   ```bash
   npm run seed
   ```

4. **Import inventory from Excel (optional)**
   - To load stock from the Luxselle BST/TBC Excel sheets into products, start the emulator (or use real Firebase), then run:

   ```bash
   npm run import-excel -- "path/to/Luxselle Inventory Managment sheet.xlsx" "path/to/Luxselle_Inventory_With_Formulas (2).xlsx"
   ```

   - If you omit paths, the script uses default paths under `~/Desktop/Luxselle docs/Invoices from BST/Exel sheet for luxselle examples/`. You can also set `LUXSELLE_EXCEL_1` and `LUXSELLE_EXCEL_2` in `.env`.

## Development

- **Start everything** (Firebase emulators + backend + frontend):

  ```bash
  npm run dev
  ```

- **Seed the database** so the UI shows products, KPIs, and activity (run once after emulator is up, or when you see empty data):

  ```bash
  npm run seed
  ```

- **Frontend only** (if backend/emulators already running):

  ```bash
  npm run dev:client
  ```

- **Emulators only**:

  ```bash
  npm run emulators
  ```

Frontend: typically `http://localhost:5173`. API: `http://localhost:3001` (Vite proxies `/api` to backend).

## Production Deployment

Deploy frontend to Vercel, backend to Railway, using Firebase for database/storage.

**Quick Start**: Follow the [Production Deployment Checklist](docs/deploy/QUICK_START_CHECKLIST.md) (~60 min setup)

**Detailed Guides**:

- [Complete Production Setup](docs/deploy/PRODUCTION_SETUP.md) - End-to-end guide
- [Railway Backend Deployment](docs/deploy/RAILWAY.md) - Express API on Railway
- [Vercel Frontend Deployment](docs/deploy/VERCEL.md) - React/Vite on Vercel

**Key Requirements**:

- **Frontend (Vercel)**: Set `VITE_API_BASE` to your Railway backend URL
- **Backend (Railway)**: Set Firebase service account credentials
- **Firebase**: Enable Firestore + Storage, deploy rules, configure CORS

**Production URLs** (for reference when setting `VITE_API_BASE` in Vercel): Railway backend = `[REDACTED]`; Vercel frontend = your project URL (e.g. `https://[REDACTED].vercel.app`).

**Production not working?** The app shows "Backend not configured" when the frontend cannot reach the API (see [Production troubleshooting](docs/deploy/PRODUCTION_TROUBLESHOOTING.md)). Most often: set `VITE_API_BASE` in Vercel to your Railway URL (no trailing slash), then redeploy. Env vars are build-time only.

## Project structure (where to find things)

| Location | Purpose |
|----------|---------|
| **config/** | Build and test configs (Vite, Vitest, Playwright). See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md). |
| **docs/** | All documentation (planning, design, Firebase, iterations). See [docs/README.md](docs/README.md). |
| **firebase/** | Firebase project: rules and indexes. See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md). |
| **packages/** | NPM workspaces: `server` (Express API), `shared` (Zod schemas). See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md). |
| **src/** | Frontend app: `pages/` (one folder per page), `components/` (shared UI + `sidecar/` for compact mode), `lib/` (API, Firebase, query client, LayoutModeContext), `styles/` (global CSS). |
| **tests/** | E2E tests (Playwright). Unit tests live next to server source in `packages/server/src`. See [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md). |
| **Root** | `package.json`, `index.html`, `.env.example`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `.firebaserc`. |

## Tests

- **Unit tests** (Vitest):

  ```bash
  npm run test
  ```

- **E2E tests** (Playwright):

  ```bash
  npm run test:e2e
  ```

  `test:e2e` now auto-installs Chromium if missing and uses `dev:e2e` under Playwright `webServer` to start backend/frontend with emulator-safe env overrides. If Firestore emulator is already listening on `:8082`, it is reused instead of starting a second emulator process.

  Or with UI: `npm run test:e2e:ui`.

### Cursor Cloud / agents

For cloud or CI images where E2E should work out-of-the-box, see [AGENTS.md](AGENTS.md) (Cursor Cloud section). To avoid repeated Chromium installs, run an env setup agent with: *"Preinstall Playwright Chromium in the cloud image/startup (`npx playwright install chromium`) so `npm run test:e2e` works out-of-the-box."*

## Scripts summary

| Script | Description |
|--------|-------------|
| `npm run dev` | Emulators + server + frontend |
| `npm run dev:e2e` | Cloud-safe E2E dev stack (reuses emulator on `:8082` if already running) |
| `npm run dev:client` | Vite frontend only |
| `npm run emulators` | Firebase Firestore + Storage emulators |
| `npm run seed` | Seed Firestore (run after dev is up) |
| `npm run test` | Unit tests (Vitest) |
| `npm run e2e:install-browser` | Install Playwright Chromium browser |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run build` | Production frontend build |

## Docs

- [Documentation index](docs/README.md) — All docs (planning, design, Firebase, iterations)
- [Code reference](docs/CODE_REFERENCE.md) — Index of documented code: what each file does, where it lives, and external references; use with in-code comments that explain behaviour
- [PRD](docs/planning/PRD.md) — Product requirements
- [Plan](docs/planning/PLAN.md) — Implementation phases (all complete)
- [Status & plan](docs/planning/STATUS_AND_PLAN.md) — Current state and gaps
- [Architecture](docs/design/ARCHITECTURE.md) — System design and API
- [Firebase setup](docs/firebase/FIREBASE_SETUP.md) — Firebase and emulator guide
