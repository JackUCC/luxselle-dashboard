# Luxselle Dashboard

## Architecture
TypeScript monorepo (NPM workspaces): React/Vite frontend + Express backend + shared Zod schemas.
Database: Firebase Firestore (emulator for local dev, production on Google Cloud).
Deploy: Vercel (frontend), Railway (backend).

## Workspaces
- `packages/server` — Express API server (`@luxselle/server`)
- `packages/shared` — Zod schemas shared between frontend and backend (`@luxselle/shared`)
- Root — React frontend with Vite

## Key Commands
- `npm run dev` — Start all services (Firebase emulators + server + Vite client)
- `npm test` — Run Vitest unit tests
- `npm run test:e2e` — Run Playwright E2E tests
- `npm run typecheck` — TypeScript type checking (`tsc --noEmit`)
- `npm run build` — Vite production build

## Code Conventions
- Shared types/schemas in `packages/shared/src/schemas/` (Zod)
- Backend routes in `packages/server/src/routes/` with Zod request validation
- Backend services in `packages/server/src/services/`
- Data access via repos in `packages/server/src/repos/` (all extend BaseRepo for Firestore CRUD)
- Frontend pages in `src/pages/` (lazy-loaded via React Router v6)
- Frontend API calls through `src/lib/api.ts`
- Server state managed with TanStack React Query
- Styling with Tailwind CSS

## Testing Patterns
- Framework: Vitest (config at `config/vitest.config.ts`)
- Test locations: colocated `*.test.ts` files next to source
- Route tests: Supertest against Express app with `vi.mock()` for repos
- Schema tests: Direct Zod schema `parse`/`safeParse` assertions
- Use `vi.hoisted()` for mock variables referenced in `vi.mock()` factories
- Run `npm test` to verify — tests must pass before committing

## Environment
- Never commit `.env` files — use `.env.example` as reference
- Firebase emulator must be running for local development
- Set `AI_PROVIDER=mock` for tests (avoids real OpenAI API calls)
- Set `FIREBASE_USE_EMULATOR=true` for local development
