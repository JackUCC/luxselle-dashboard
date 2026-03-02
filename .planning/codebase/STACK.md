# Technology Stack

**Analysis Date:** 2026-03-02

## Languages

**Primary:**
- TypeScript 5.6 - All source code across frontend, backend, and shared packages
- CSS (Tailwind utility classes) - All styling

**Secondary:**
- JavaScript (CJS) - Playwright config (`config/playwright.config.cjs`), legacy scripts

## Runtime

**Environment:**
- Node.js 18.x / 20.x / 22.x / 24.x (defined in `package.json` `engines` field)
- Production pinned to Node 22 via `nixpacks.toml` for Railway deployment

**Package Manager:**
- npm with workspaces
- Lockfile: `package-lock.json` present

## Monorepo Structure

**Workspaces:**
- Root (`luxselle-dashboard`) — React/Vite frontend
- `packages/server` (`@luxselle/server`) — Express API backend
- `packages/shared` (`@luxselle/shared`) — Zod schemas shared between frontend and backend

**`packages/shared`** uses `"type": "module"` with `"main": "src/index.ts"` — consumed as TypeScript source directly (no build step). Alias `@shared/*` maps to `packages/shared/src/*` in both `tsconfig.json` and `config/vite.config.ts`.

## Frameworks

**Core (Frontend):**
- React 18.3 - UI framework
- React Router DOM 6.27 - Client-side routing with lazy-loaded pages
- Vite 5.4 - Dev server and build tool; config at `config/vite.config.ts`
- Tailwind CSS 3.4 - Utility-first styling; config at `tailwind.config.js`
- Framer Motion 12 - Animations and transitions

**Core (Backend):**
- Express 4.21 - HTTP server and routing; entry at `packages/server/src/server.ts`
- tsx 4.19 - TypeScript execution without build (`tsx watch src/server.ts` for dev, `tsx src/server.ts` for prod)

**State Management:**
- Manual `useEffect` + `apiGet` + `useState` per page (primary pattern)
- TanStack React Query 5.90 — client and `queryKeys` defined in `src/lib/queryClient.ts` for incremental migration

**Testing:**
- Vitest 4.0 — unit and integration test runner; config at `config/vitest.config.ts`
- Playwright 1.58 — E2E tests; config at `config/playwright.config.cjs`
- Supertest 7.2 — Express route integration tests

**Build/Dev:**
- concurrently 9.1 — runs Firebase emulators + server + Vite client in parallel via `npm run dev`
- vite-tsconfig-paths 6.0 — resolves TypeScript path aliases in Vitest

## Key Dependencies

**Critical (Backend):**
- `firebase-admin` 13.0 — Firestore and Firebase Storage via Admin SDK; initialized in `packages/server/src/config/firebase.ts`
- `zod` 3.23 — schema validation in both backend routes and shared schemas
- `openai` 6.17 — OpenAI SDK for GPT-4o-mini and GPT-4o (vision); used through `AiRouter`
- `googleapis` 140.0 — Google Gmail API for supplier email sync (`SupplierEmailSyncService`)
- `multer` 2.0 — multipart file upload handling (CSV/XLSX import, image uploads)
- `cors` 2.8 — CORS middleware with origin allowlist

**Document Processing:**
- `pdf-parse` 2.4 — parse invoice and inventory PDFs
- `pdfmake` 0.3 — generate PDF invoices
- `xlsx` 0.18 — parse Excel/XLSX spreadsheets for inventory import
- `csv-parse` 6.1 — parse CSV supplier files
- `sharp` 0.34 — image resizing and conversion for visual search pipeline

**Critical (Frontend):**
- `@tanstack/react-virtual` 3.13 — virtualized lists for large product/inventory tables
- `lucide-react` 0.563 — icon library
- `react-hot-toast` 2.6 — toast notifications
- `@vercel/speed-insights` 1.3 — Vercel performance monitoring

**Infrastructure:**
- `firebase-tools` 13.20 — Firebase emulator for local development (Firestore port 8082, Storage port 9198)
- `dotenv` 16.4 — loads `.env` on backend server startup
- `tailwindcss-animate` 1.0 — animation utilities (used in `tailwind.config.js` plugins)
- `autoprefixer` 10.4 / `postcss` 8.4 — CSS processing pipeline

## Configuration

**Environment:**
- Backend env is validated with Zod at startup in `packages/server/src/config/env.ts`
- Key env vars: `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_USE_EMULATOR`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`, `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `AI_ROUTING_MODE`, `PORT`, `FRONTEND_ORIGINS`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_USER`
- Frontend env: `VITE_API_BASE` — sets backend URL for production (relative `/api` used in dev via Vite proxy)
- `.env` file present at project root (never commit; `.env.example` is the reference)

**TypeScript:**
- Root `tsconfig.json` — frontend config; strict mode, ES2022 target, `@shared/*` path alias
- Backend has its own tsconfig (inherits from root defaults via tsx)
- `moduleResolution: "Bundler"` in root tsconfig

**Build:**
- Frontend: `vite build --config config/vite.config.ts` → `dist/`
- Backend: no build step; tsx executes TypeScript directly
- Vitest config: `config/vitest.config.ts` — `environment: 'node'`, tests in `packages/server/src/**`, `packages/shared/src/**`, `src/lib/**`

## Platform Requirements

**Development:**
- Node.js 18–24
- Firebase CLI (`firebase-tools`) for emulators
- Run `FIREBASE_USE_EMULATOR=true` and `AI_ROUTING_MODE=dynamic` locally
- Firebase emulators must be running: Firestore on port 8082, Storage on 9198

**Production:**
- Frontend: Vercel (`vercel.json` — Vite framework, SPA rewrites to `index.html`, assets cached 1 year)
- Backend: Railway (`railway.toml` — nixpacks builder, Node 22, `npm run start --workspace=@luxselle/server`)

---

*Stack analysis: 2026-03-02*
