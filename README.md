# Luxselle Dashboard

Full-stack dashboard for inventory, buying list, sourcing, and pricing. React + Vite + Tailwind frontend, Express API, Firebase Firestore (emulator for local dev).

## Setup

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd luxselle-dashboard
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env` in the project root.
   - For local development, defaults in `.env.example` are sufficient (emulator + mock AI).

   | Variable | Purpose |
   |----------|---------|
   | `FIREBASE_USE_EMULATOR` | `true` for local Firestore/Storage emulator |
   | `FIREBASE_PROJECT_ID` | Firebase project ID |
   | `FIREBASE_STORAGE_BUCKET` | Storage bucket name |
   | `FIRESTORE_EMULATOR_HOST` | e.g. `127.0.0.1:8080` |
   | `FIREBASE_STORAGE_EMULATOR_HOST` | e.g. `127.0.0.1:9199` |
   | `GOOGLE_APPLICATION_CREDENTIALS` | Path to service account JSON (leave empty for emulator) |
   | `AI_PROVIDER` | `mock` \| `openai` \| `gemini` |
   | `OPENAI_API_KEY` / `GEMINI_API_KEY` | Optional; required only when not using `mock` |
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

## Project structure (where to find things)

| Location | Purpose |
|----------|---------|
| **config/** | Build and test configs (Vite, Vitest, Playwright). See [config/README.md](config/README.md). |
| **docs/** | All documentation (planning, design, Firebase, iterations). See [docs/README.md](docs/README.md). |
| **firebase/** | Firebase project: rules and indexes. See [firebase/README.md](firebase/README.md). |
| **packages/** | NPM workspaces: `server` (Express API), `shared` (Zod schemas). See [packages/README.md](packages/README.md). |
| **src/** | Frontend app: `pages/` (one folder per page), `components/` (shared UI), `lib/` (API, Firebase, query client), `styles/` (global CSS). |
| **tests/** | E2E tests (Playwright). Unit tests live next to server source in `packages/server/src`. See [tests/README.md](tests/README.md). |
| **Root** | `package.json`, `index.html`, `.env.example`, `tsconfig.json`, `tailwind.config.js`, `postcss.config.js`, `.firebaserc`. |

## Tests

- **Unit tests** (Vitest):
  ```bash
  npm run test
  ```
- **E2E tests** (Playwright): Start the app first, then run tests.
  ```bash
  npm run dev
  ```
  In another terminal (after the app is up):
  ```bash
  npx playwright install   # once, if browsers are missing
  npm run test:e2e
  ```
  Or with UI: `npm run test:e2e:ui`. Playwright can also start the server automatically (see `config/playwright.config.ts`); ensure emulators and backend are up if you rely on that.

## Scripts summary

| Script | Description |
|--------|-------------|
| `npm run dev` | Emulators + server + frontend |
| `npm run dev:client` | Vite frontend only |
| `npm run emulators` | Firebase Firestore + Storage emulators |
| `npm run seed` | Seed Firestore (run after dev is up) |
| `npm run test` | Unit tests (Vitest) |
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
