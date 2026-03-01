# Luxselle Dashboard Memory

## Project Status (as of 2026-03-01)
- **Milestone:** v2.0 complete (9 phases, 197/197 tests passing)
- **Current phase:** Phase 10 (AI Reliability) is next — planned, not started
- **GSD state:** STATE.md updated, ROADMAP.md has phases 10-12 added

## Architecture Quick Reference
- Frontend: React/Vite at repo root (`src/`)
- Backend: Express at `packages/server/src/`
- Shared schemas: `packages/shared/src/schemas/` (Zod)
- AI: `AiRouter` (`packages/server/src/services/ai/AiRouter.ts`) handles all providers
- Search: `SearchService` (`packages/server/src/services/search/SearchService.ts`) uses AiRouter
- Price check: `PriceCheckService` (`packages/server/src/services/price-check/PriceCheckService.ts`)

## Known Issues
- **AI silent failures**: `searchMarket()` catches all errors and returns empty → price check shows €0 instead of "provider unavailable" error. Fix tracked as Phase 10 / STAB-01.
- **Local dev**: `.env` has placeholder API keys. User must replace with real keys before AI features work locally.
- **Perplexity model**: Was `sonar-pro` (premium only) — changed to `sonar` in env.ts, env.ts.example, and .env.

## AI Provider Configuration
- `AI_ROUTING_MODE=dynamic` → Perplexity preferred for web_search, OpenAI for structured extraction
- `PERPLEXITY_SEARCH_MODEL=sonar` (changed from sonar-pro which required premium tier)
- Both providers have placeholder keys locally; must be replaced with real keys
- If only one provider available: set `AI_ROUTING_MODE=openai` or `AI_ROUTING_MODE=perplexity` explicitly

## Test Patterns
- `env.test.ts`: Uses `vi.mock('dotenv', () => ({ default: { config: vi.fn() } }))` to prevent .env loading
- All tests use `vi.resetModules()` in beforeEach when testing module-level behavior
- Run `npm test` to verify — must be 197/197

## GSD Phase Roadmap
- Phase 10: AI Reliability + Provider Diagnostics (STAB-01) — context in `.planning/phases/10-ai-reliability-provider-diagnostics/10-CONTEXT.md`
- Phase 11: INTEL-02 Agentic Market Intelligence
- Phase 12: QUAL-01 Inventory/Invoice verification + ML-01 price prediction improvements

## User Preferences
- Concise responses, minimal emojis
- GSD workflow for all significant feature work
- Fix tests before committing
