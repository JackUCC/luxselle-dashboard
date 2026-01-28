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
- **Frontend only** (if backend/emulators already running):
  ```bash
  npm run dev:client
  ```
- **Emulators only**:
  ```bash
  npm run emulators
  ```

Frontend: typically `http://localhost:5173`. API: `http://localhost:3001` (Vite proxies `/api` to backend).

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
  Or with UI: `npm run test:e2e:ui`. Playwright can also start the server automatically (see `playwright.config.ts`); ensure emulators and backend are up if you rely on that.

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

- [PRD](docs/PRD.md) — Product requirements
- [Plan](docs/PLAN.md) — Implementation phases (0–6 complete, Phase 7 polish)
- [Status & plan](docs/STATUS_AND_PLAN.md) — Current state and gaps
- [Architecture](docs/design/ARCHITECTURE.md) — System design and API
- [Decisions](docs/design/DECISIONS.md) — ADRs
- [Firebase setup](docs/firebase/FIREBASE_SETUP.md) — Firebase and emulator guide
- [Firebase quick ref](docs/firebase/FIREBASE_QUICK_REF.md) — Commands and URLs
