# Testing Patterns

**Analysis Date:** 2026-03-02

## Test Framework

**Runner:**
- Vitest ^4.0.18
- Config: `config/vitest.config.ts`
- Uses `vite-tsconfig-paths` plugin to resolve `@shared/*` alias in tests

**Assertion Library:**
- Vitest built-in (`expect`, `toBe`, `toEqual`, `toMatchObject`, `toHaveBeenCalledWith`, etc.)

**HTTP Testing:**
- Supertest ^7.2.2 for route-level integration tests

**E2E Framework:**
- Playwright ^1.58.0
- Config: `config/playwright.config.cjs`
- Browser: Chromium only

**Run Commands:**
```bash
npm test                    # Run all unit tests once
npm run test:watch          # Vitest watch mode
npm run test:e2e            # Playwright E2E tests
npm run test:e2e:ui         # Playwright UI mode
npm run typecheck           # TypeScript type check (gate before commit)
```

## Test File Organization

**Location:**
- Unit/integration tests: co-located with source files as `*.test.ts`
- E2E tests: `tests/e2e/*.spec.ts` (separate directory)

**Naming:**
- Unit/integration: `<filename>.test.ts` adjacent to source (e.g., `pricing.ts` → `pricing.test.ts`)
- Matrix/variant tests: `<filename>.<variant>.test.ts` (e.g., `AiRouter.matrix.test.ts`)
- E2E: `<feature>.spec.ts` (e.g., `evaluator.spec.ts`, `invoices.spec.ts`)

**Vitest include patterns (from `config/vitest.config.ts`):**
```
packages/server/src/**/*.{test,spec}.ts
packages/shared/src/**/*.{test,spec}.ts
src/lib/**/*.{test,spec}.ts
```

Note: Frontend component tests are not present — only `src/lib/` utility tests are covered by Vitest.

## Test Suite Structure

**Standard route test structure:**
```typescript
/**
 * Route description and what is tested.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express, { type Request, type Response, type NextFunction } from 'express'
import { ZodError } from 'zod'
import { myRouter } from './myRoute'

// 1. Hoist mock variable declarations
const { mockMethod } = vi.hoisted(() => ({
  mockMethod: vi.fn(),
}))

// 2. Mock dependencies (repos, services)
vi.mock('../repos/MyRepo', () => ({
  MyRepo: class {
    method = mockMethod
  },
}))

// 3. Build isolated Express app
const app = express()
app.use(express.json())
app.use('/api/route', myRouter)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Error handler matching production behavior
})

describe('POST /api/route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with expected shape on success', async () => {
    mockMethod.mockResolvedValue({ ... })
    const res = await request(app).post('/api/route').send({ ... })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ ... })
  })
})
```

**Standard utility/pure function test structure:**
```typescript
import { describe, it, expect } from 'vitest'
import { myFunction } from './myModule'

describe('myFunction', () => {
  it('calculates expected result for nominal case', () => {
    const result = myFunction({ input: 'value' })
    expect(result.field).toBeCloseTo(123.45)
  })

  it('throws when invalid input provided', () => {
    expect(() => myFunction({ invalid: true })).toThrow('Error message')
  })
})
```

**Standard schema test structure (from `packages/shared/src/schemas/schemas.test.ts`):**
```typescript
describe('FooSchema', () => {
  const minimalFoo = { /* required fields only */ }

  it('parses minimal valid foo', () => {
    const result = FooSchema.safeParse(minimalFoo)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.optionalField).toBe('defaultValue')
    }
  })

  it('applies optional defaults', () => {
    const result = FooSchema.parse(minimalFoo)
    expect(result.optionalField).toBe('defaultValue')
  })

  it('rejects missing required fields', () => {
    const bad = { ...minimalFoo, requiredField: undefined }
    expect(FooSchema.safeParse(bad).success).toBe(false)
  })
})
```

## Mocking

**Framework:** Vitest `vi.mock()` and `vi.hoisted()`

**Critical pattern — `vi.hoisted()` for mock variables:**
Mock function variables that are referenced inside `vi.mock()` factory functions MUST be declared with `vi.hoisted()` to avoid temporal dead zone issues:
```typescript
const { mockCheck, mockList } = vi.hoisted(() => ({
  mockCheck: vi.fn(),
  mockList: vi.fn(),
}))

vi.mock('../services/MyService', () => ({
  MyService: class {
    check = mockCheck
  },
}))
```

**Mocking entire module classes:**
```typescript
vi.mock('../repos/ProductRepo', () => ({
  ProductRepo: class {
    list = mockList
    getById = mockGetById
    set = mockProductSet
  },
}))
```

**Dynamic mocking with `vi.resetModules()` and `vi.doMock()`:**
Used in service tests that need different env configurations per test:
```typescript
const loadPricingService = async (overrides: Partial<typeof defaultEnv> = {}) => {
  vi.resetModules()
  vi.doMock('../../config/env', () => ({
    env: { ...defaultEnv, ...overrides },
  }))
  const module = await import('./PricingService')
  return module.PricingService
}
```

**Mocking auth middleware in route tests:**
Auth middleware is consistently replaced with a test double that reads role from `x-test-role` header:
```typescript
vi.mock('../middleware/auth', () => ({
  requireAuth: (req, _res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
      next({ status: 401, code: 'UNAUTHORIZED', message: '...' })
      return
    }
    req.user = { role: String(req.headers['x-test-role'] ?? 'readOnly') }
    next()
  },
  requireRole: (...allowedRoles) => (req, _res, next) => {
    const role = String(req.headers['x-test-role'] ?? 'readOnly')
    if (!allowedRoles.includes(role)) {
      next({ status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' })
      return
    }
    next()
  },
}))

// Usage in tests:
const authHeaders = (role = 'admin') => ({
  Authorization: 'Bearer test-token',
  'x-test-role': role,
})
```

**Mocking Firebase:**
```typescript
vi.mock('../config/firebase', () => ({
  db: {
    collection: vi.fn(() => ({
      limit: mockProductsLimit,
    })),
    batch: vi.fn(() => ({
      delete: mockBatchDelete,
      commit: mockBatchCommit,
    })),
  },
  storage: {},
}))
```

**Mocking global fetch for AI provider tests:**
```typescript
global.fetch = fetchMock as unknown as typeof fetch
fetchMock.mockResolvedValueOnce({
  ok: true,
  status: 200,
  json: async () => ({ choices: [{ message: { content: 'result' } }] }),
} satisfies Partial<Response>)
```

**What to mock:**
- All repos (`*Repo`) in route and service tests
- `config/env` when testing env-dependent behavior
- AI provider clients (`openai`, Perplexity via `fetch`)
- Auth middleware in route tests
- Firebase config in route tests

**What NOT to mock:**
- Zod schemas (test them directly)
- Pure utility functions (test them directly, no mocking needed)
- The module under test itself

## Fixtures and Factories

**Test data factories location:** `packages/server/src/test-utils/pricingFixtures.ts`

**Available factories:**
```typescript
// Base pricing input object
export const basePricingInput: PricingAnalysisInput

// Factory for Transaction objects
export const makeTransaction = (amountEur: number, type?: Transaction['type']): Transaction

// Factory for Product objects
export const makeProduct = (id: string, brand: string, model: string): Product & { id: string }
```

**Pattern for inline test data:** Minimal object literals defined inside `it()` blocks or as `const` at describe-block level. Named `minimal<Entity>` when testing schema defaults:
```typescript
const minimalProduct = {
  organisationId: 'org1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  brand: 'Brand',
  model: 'Model X',
  costPriceEur: 100,
  sellPriceEur: 150,
  status: 'in_stock',
}
```

## Coverage

**Requirements:** No coverage threshold enforced in `config/vitest.config.ts`

**View Coverage:**
```bash
# Not configured — run with:
npx vitest --coverage --config config/vitest.config.ts
```

## Test Types

**Unit Tests (pure function):**
- Scope: Single exported function, zero side effects
- Location: `src/lib/*.test.ts`, `packages/server/src/lib/*.test.ts`
- Examples: `landedCost.test.ts`, `vat.test.ts`, `fx.test.ts`, `sourcingStatus.test.ts`
- No mocking needed — pass inputs, assert outputs

**Integration Tests (route/service):**
- Scope: Full route handler with mocked repos/services, or service logic with mocked AI/DB dependencies
- Location: `packages/server/src/routes/*.test.ts`, `packages/server/src/services/**/*.test.ts`
- Uses Supertest to build isolated Express app per test file
- Repos always mocked via `vi.mock()`
- Auth middleware mocked with role-based test double

**Schema Tests:**
- Scope: Zod schema parse/safeParse behavior, defaults, coercions, rejections
- Location: `packages/shared/src/schemas/schemas.test.ts`
- Direct Zod `.parse()` and `.safeParse()` — no mocking

**E2E Tests:**
- Framework: Playwright with Chromium
- Location: `tests/e2e/*.spec.ts`
- Uses `test.beforeEach`/`test.afterEach` to clear Firestore emulator via HTTP DELETE
- API routes mocked via `page.route()` for AI-dependent endpoints
- Tests real app navigation, form interactions, and visible DOM states
- Firestore cleared between tests: `DELETE http://127.0.0.1:8082/emulator/v1/projects/{id}/databases/(default)/documents`

## Common Patterns

**Async Testing:**
All async test bodies use `async/await` directly. No `.then()` chaining.
```typescript
it('returns 200 on success', async () => {
  mockList.mockResolvedValue([])
  const res = await request(app).get('/api/products').set(authHeaders())
  expect(res.status).toBe(200)
})
```

**Error Testing (route level):**
```typescript
it('returns 400 when required field is missing', async () => {
  const res = await request(app)
    .post('/api/pricing/price-check')
    .send({})
  expect(res.status).toBe(400)
  expect(res.body.error).toBeDefined()
  expect(res.body.error.code).toBe(API_ERROR_CODES.VALIDATION)
  expect(res.body.error.message).toMatch(/query|required/i)
})
```

**Error Testing (thrown error):**
```typescript
it('throws FX rate unavailable when rates is null', () => {
  expect(() => calculateLandedCost({ ..., currency: 'USD', rates: null }))
    .toThrow('FX rate unavailable')
})
```

**Testing service throws → route returns 503:**
```typescript
it('returns 503 when AI providers are unavailable', async () => {
  mockCheck.mockRejectedValue(new Error('no_provider_available'))
  const res = await request(app).post('/api/pricing/price-check').send({ query: 'test' })
  expect(res.status).toBe(503)
  expect(res.body.error.code).toBe(API_ERROR_CODES.INTERNAL)
})
```

**`toMatchObject` vs `toEqual`:**
- `toMatchObject` used when testing partial shapes (allows extra fields)
- `toEqual` used when testing exact values (e.g., `{ deleted: 2 }`)

**Checking call arguments:**
```typescript
expect(mockTransactionCreate).toHaveBeenCalledWith(
  expect.objectContaining({
    type: 'sale',
    productId: 'p1',
    amountEur: 2200,
  })
)
```

**Spy on console for audit log assertions:**
```typescript
const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined)
// ... run action ...
const logPayload = JSON.parse(infoSpy.mock.calls[0][0] as string)
expect(logPayload.requester).toBe('admin-user')
infoSpy.mockRestore()
```

**afterEach cleanup:**
```typescript
afterEach(() => {
  vi.restoreAllMocks()
})
```

## AI Provider Test Requirements

When writing tests for code that uses `AiRouter` or env config:
- Always set `AI_ROUTING_MODE: 'dynamic'` in mocked env (prevents real provider calls)
- Always mock `config/env` — never allow real API keys to be read
- Mock `openai` SDK and `global.fetch` for Perplexity HTTP calls
- Use `vi.resetModules()` + `vi.doMock()` when testing per-env behavior variants

---

*Testing analysis: 2026-03-02*
