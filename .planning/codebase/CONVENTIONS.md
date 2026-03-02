# Coding Conventions

**Analysis Date:** 2026-03-02

## Naming Patterns

**Files:**
- Route files: `kebab-case.ts` (e.g., `market-research.ts`, `pricing.ts`)
- Route test files: `kebab-case.test.ts` co-located with source (e.g., `pricing.test.ts`)
- Service files: `PascalCase.ts` (e.g., `PricingService.ts`, `SearchService.ts`)
- Repo files: `PascalCase.ts` (e.g., `ProductRepo.ts`, `InvoiceRepo.ts`)
- Schema files: `camelCase.ts` (e.g., `product.ts`, `sourcingRequest.ts`)
- React components: `PascalCase.tsx` (e.g., `EvaluatorView.tsx`, `Button.tsx`)
- React hook files: `camelCase.ts` with `use` prefix (e.g., `useScrollLock.ts`)
- Context files: `PascalCase.tsx` suffix `Context` (e.g., `LayoutModeContext.tsx`)
- Test spec files (E2E): `kebab-case.spec.ts` under `tests/e2e/`

**Functions:**
- Route handlers: anonymous async arrow functions inline with `router.post()`
- Service methods: camelCase (e.g., `analyse`, `calculateAuctionLandedCost`, `getSettings`)
- Repo methods: camelCase, standard CRUD verbs (`list`, `getById`, `create`, `set`, `remove`)
- Utilities: camelCase (e.g., `formatCurrency`, `vatFromNet`, `calculateLandedCost`)
- API client functions: `apiGet`, `apiPost`, `apiPut`, `apiDelete`, `apiPostFormData`

**Variables:**
- camelCase throughout
- Boolean state variables prefixed with `is`/`has` (e.g., `isLoading`, `isSidecar`, `isFlashing`)
- Mock functions in tests: `mock` prefix + PascalCase descriptor (e.g., `mockCheck`, `mockList`, `mockGetById`)

**Types/Interfaces:**
- PascalCase for interfaces and type aliases
- Zod schema names: `PascalCase` + `Schema` suffix (e.g., `ProductSchema`, `PriceCheckInputSchema`)
- Inferred types from Zod: `export type Foo = z.infer<typeof FooSchema>`
- Type-only imports: `import type { Foo } from '...'`
- Generic repo utility type: `WithId<T>` for Firestore docs with id attached

**Constants:**
- `SCREAMING_SNAKE_CASE` for top-level constants (e.g., `API_ERROR_CODES`, `DEFAULT_ORG_ID`, `ROUTING_MODES`)

## Code Style

**Formatting:**
- No `.prettierrc` or `.eslintrc` detected — no automated formatter enforced at config level
- TypeScript strict mode enabled (`"strict": true` in `tsconfig.json`)
- Target: ES2022, module resolution: Bundler

**TypeScript Settings:**
- `noEmit: true` for frontend typecheck
- `esModuleInterop: true`
- `resolveJsonModule: true`
- Path alias: `@shared/*` → `packages/shared/src/*`

**Linting:**
- No ESLint config detected at root
- TypeScript compiler used as primary type correctness gate (`npm run typecheck`)

## Import Organization

**Order (observed pattern):**
1. Framework/runtime imports (`react`, `express`, `zod`)
2. Third-party library imports (`lucide-react`, `react-router-dom`, `framer-motion`)
3. Internal path-aliased imports (`@shared/schemas`)
4. Relative imports from same package (`../lib/errors`, `../../components/widgets`)

**Path Aliases:**
- `@shared/*` maps to `packages/shared/src/*` (used on both frontend and backend)
- Backend also uses workspace package name `@luxselle/shared`

**Type-only imports:**
- Used consistently: `import type { Product } from '@shared/schemas'`

## File-Level Documentation

Each significant source file opens with a JSDoc-style block comment describing:
- What the file does (one-line summary)
- Key exports or entry points
- `@see docs/CODE_REFERENCE.md` reference
- `References:` dependencies list

Example pattern from `packages/server/src/routes/pricing.ts`:
```typescript
/**
 * Pricing API: AI-powered pricing suggestions (image or analysis input); uses PricingService and env (margin, FX).
 * @see docs/CODE_REFERENCE.md
 * References: Express, PricingService, multer, @shared/schemas
 */
```

## Error Handling

**Backend API errors:**
- All routes use `next(error)` to propagate to a global error handler in `packages/server/src/server.ts`
- Standard error shape: `{ error: { code: string, message: string, details?: object } }`
- Canonical error codes defined in `packages/server/src/lib/errors.ts` as `API_ERROR_CODES`:
  ```typescript
  VALIDATION: 'VALIDATION_ERROR'
  BAD_REQUEST: 'BAD_REQUEST'
  NOT_FOUND: 'NOT_FOUND'
  CONFLICT: 'CONFLICT'
  INTERNAL: 'INTERNAL_ERROR'
  UNAUTHORIZED: 'UNAUTHORIZED'
  FORBIDDEN: 'FORBIDDEN'
  ```
- Use `formatApiError(code, message, details?)` to build error response bodies
- `ApiError` class in `packages/server/src/lib/errors.ts` for programmatic error throwing with status codes
- ZodError caught at global middleware level — renders as `VALIDATION_ERROR` with field details
- AI availability errors have a dedicated guard pattern (`isAiUnavailableError`) returning 503

**Frontend errors:**
- `ApiError` class in `src/lib/api.ts` carries `.status` for HTTP status code
- All API functions throw `ApiError` on non-ok responses
- Error messages extracted from `{ error: { message } }` shape or raw response text
- `react-hot-toast` used for user-facing error notifications

## Logging

**Backend Framework:** Structured JSON logger in `packages/server/src/middleware/requestId.ts`

**Logger API:**
```typescript
import { logger } from '../middleware/requestId'
logger.info('message', { key: 'value' })
logger.warn('message', { key: 'value' })
logger.error('message', error, { key: 'value' })
```

**Log format:** All logs are JSON objects with `level`, `message`, `timestamp`, and optional metadata fields.

**Request logging:** Automatic via `requestLogger` middleware — logs `request_start` and `request_end` with requestId, method, path, statusCode, duration.

**Audit logging:** Destructive admin actions log structured JSON via `console.info` (see `products.ts` `/clear` endpoint).

**Direct console usage:** `console.error` used in middleware catch blocks and `console.log` in startup/config for non-request-context situations.

## React Component Patterns

**Component structure:**
- Default exports for all page-level and design-system components
- Named exports via barrel `index.ts` in `src/components/design-system/`
- Props interfaces: `interface FooProps extends HTMLFooElement { ... }` pattern when extending HTML elements
- Components accept `className?: string` for Tailwind override

**State management:**
- Local: `useState` + `useEffect` pattern (manual, not React Query) for most pages
- API calls: `apiGet`/`apiPost` from `src/lib/api.ts` inside `useEffect` or event handlers
- React Query client exists at `src/lib/queryClient.ts` but is optional for incremental migration
- Context API used for cross-cutting state: `LayoutModeContext`, `ResearchSessionContext`, `ServerStatusContext`

**Styling:**
- Tailwind CSS utility classes throughout
- Custom design tokens used via Tailwind class names (e.g., `lux-btn-primary`, `text-lux-success`)
- Framer Motion used for animated transitions in design-system components

## Zod Schema Patterns

**Shared schemas location:** `packages/shared/src/schemas/` — one file per entity type

**Schema composition:**
- `BaseDocSchema` extended by all entity schemas (provides `organisationId`, `createdAt`, `updatedAt`)
- `z.coerce.number()` used for numeric fields to handle string-coercion from form/CSV data
- Optional fields default to empty string `''`, `0`, `[]`, or domain-specific values (e.g., `currency: 'EUR'`)
- Type inferred from schema: `export type Product = z.infer<typeof ProductSchema>`

**Validation location:**
- Backend: Zod `.parse()` inside route handlers before service calls (throws caught by global middleware)
- Repos: Zod `.parse()` on document read in `BaseRepo.parseDoc()`
- Env config: Zod schema in `packages/server/src/config/env.ts` validates all env vars at startup

## Repository Pattern

**Base class:** `packages/server/src/repos/BaseRepo.ts`
- Generic `BaseRepo<T>` with standard CRUD: `list`, `getById`, `create`, `set`, `remove`
- All entity repos extend `BaseRepo` with minimal code:
  ```typescript
  export class ProductRepo extends BaseRepo<Product> {
    constructor() {
      super('products', ProductSchema)
    }
  }
  ```
- `WithId<T>` type: `T & { id: string }` for all documents returned from Firestore
- Firestore `Timestamp` auto-serialized to ISO strings in `serializeDocData()`

## Module Design

**Exports:**
- Design-system: barrel `index.ts` with named exports
- Schemas: barrel `packages/shared/src/schemas/index.ts` re-exporting all entity schemas
- Repos: barrel `packages/server/src/repos/index.ts`
- Services: no barrel — imported directly by path

**Barrel Files:**
- Used for design-system components and shared schemas
- Not used for routes or services (imported by exact path)

---

*Convention analysis: 2026-03-02*
