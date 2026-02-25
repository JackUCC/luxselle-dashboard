---
name: gen-test
description: Generate unit or integration tests following project Vitest patterns. Provide a file path or function name to test.
disable-model-invocation: true
---

# Generate Tests

Generate tests for the specified file or function following the project's established testing patterns.

## Framework & Config

- **Test runner**: Vitest (config at `config/vitest.config.ts`)
- **Test locations**: Colocated `*.test.ts` files next to source files
- **Test include paths**: `packages/server/src/**/*.test.ts`, `src/lib/**/*.test.ts`

## Patterns to Follow

### Route/API Tests (Supertest)
For files in `packages/server/src/routes/`:
- Import `supertest`, `express`, and the router under test
- Use `vi.hoisted()` for mock variables, then `vi.mock()` for repo dependencies
- Mount the router on a test Express app with `express.json()` middleware
- Add an error handler that returns the standard `{ error: { code, message, details } }` shape
- Test happy paths, validation errors (Zod), and edge cases
- Reference: `packages/server/src/routes/sourcing.test.ts`

### Service Tests
For files in `packages/server/src/services/`:
- Mock external dependencies (repos, APIs) with `vi.mock()`
- Test business logic in isolation
- Reference: `packages/server/src/services/pricing/PricingService.test.ts`

### Schema Tests
For files in `packages/shared/src/schemas/`:
- Test valid data passes `schema.parse()`
- Test invalid data throws with `expect(() => schema.parse(bad)).toThrow()`
- Test edge cases and optional fields

### Frontend Utility Tests
For files in `src/lib/`:
- Pure function tests with `describe`/`it`/`expect`
- Reference: `src/lib/landedCost.test.ts`, `src/lib/serialDateDecoder.test.ts`

## After Generating

Always run `npm test` to verify the new tests pass.
