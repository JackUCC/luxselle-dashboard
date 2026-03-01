# Architecture Decisions

## Decision Log

### ADR-001: Monorepo Structure
**Status**: Accepted  
**Context**: Need to share types and schemas between frontend and backend.  
**Decision**: Use pnpm workspaces with separate `src/` (frontend), `server/` (backend), and `shared/` (common code).  
**Consequences**: 
- Single repo for all code
- Shared types prevent drift
- More complex build setup

### ADR-002: Firebase Emulator First
**Status**: Accepted  
**Context**: Must work locally without paid services.  
**Decision**: Default to Firebase Emulator, allow switching to real Firebase via env vars.  
**Consequences**:
- Zero cost local development
- Emulator limitations (e.g., Storage emulator quirks)
- Need to handle emulator vs real Firebase config differences

### ADR-003: Dynamic Multi-Provider AI Routing Default
**Status**: Accepted  
**Context**: Search and extraction tasks perform better on different providers and runtime mock data is not acceptable for production behavior.  
**Decision**: Dynamic task-based routing is default (`AI_ROUTING_MODE=dynamic`): Perplexity-first web retrieval, OpenAI-first structured extraction/generation, OpenAI-only vision. Runtime mock mode is removed.  
**Consequences**:
- Better retrieval/extraction quality and resilience via failover
- Explicit degraded/503 behavior when provider keys are unavailable
- Test doubles remain in unit/integration tests only (no runtime mock provider path)

### ADR-004: Server-Side AI Only
**Status**: Accepted  
**Context**: Security and cost control.  
**Decision**: All AI calls happen server-side, never from browser.  
**Consequences**:
- API keys stay secure
- Can rate limit and cache responses
- Requires backend API for all AI features

### ADR-005: Zod for Validation
**Status**: Accepted  
**Context**: Need runtime validation and TypeScript types.  
**Decision**: Use Zod schemas in `shared/`, infer types from schemas.  
**Consequences**:
- Single source of truth for data shapes
- Runtime validation at API boundaries
- Type safety without duplication

### ADR-006: No Auth in MVP
**Status**: Accepted  
**Context**: Iteration 4 focuses on core workflows.  
**Decision**: Single organisation "default", no user authentication.  
**Consequences**:
- Faster development
- Not production-ready
- Must add auth in future iteration

### ADR-007: EUR Base Currency
**Status**: Accepted  
**Context**: Business operates in EUR.  
**Decision**: Base currency is EUR, convert supplier USD prices using fxUsdToEur setting.  
**Consequences**:
- Store both USD and EUR for supplier items
- Need to update fx rate periodically
- Calculations use EUR consistently

### ADR-008: Activity Events for Audit Trail
**Status**: Accepted  
**Context**: Need to track what happened in the system.  
**Decision**: Create activity_events for major actions (create, update, receive, import).  
**Consequences**:
- Audit trail for debugging
- Can build activity feed
- Additional writes to Firestore

### ADR-009: CSV Import Only (No URL Fetch)
**Status**: Accepted  
**Context**: MVP scope limitation.  
**Decision**: Manual CSV upload only, no automatic URL fetching.  
**Consequences**:
- Simpler implementation
- Users must download and upload CSV manually
- Can add URL fetch in future

### ADR-010: Express Backend
**Status**: Accepted  
**Context**: Need REST API for frontend.  
**Decision**: Use Express.js for backend API server.  
**Consequences**:
- Simple, well-understood framework
- Easy to add middleware
- Can migrate to serverless functions later if needed

### ADR-011: React Query (Future)
**Status**: Deferred  
**Context**: Need data fetching and caching.  
**Decision**: Consider React Query in Phase 7 or later.  
**Consequences**:
- Manual fetch for MVP
- Can add React Query for better UX later

### ADR-012: Single Command Dev Runner
**Status**: Accepted  
**Context**: Developer experience.  
**Decision**: `pnpm dev` starts emulators, backend, and frontend concurrently.  
**Consequences**:
- Easy onboarding
- Requires process management (concurrently)
- All services must start successfully

### ADR-013: TypeScript Strict Mode
**Status**: Accepted  
**Context**: Type safety.  
**Decision**: Use TypeScript with strict mode enabled.  
**Consequences**:
- Better type safety
- More verbose code
- Catches errors at compile time

### ADR-014: Tailwind CSS (Preserve Existing)
**Status**: Accepted  
**Context**: UI framework already in place.  
**Decision**: Keep Tailwind CSS, don't rewrite styling.  
**Consequences**:
- Consistent with existing setup
- Fast UI development
- Utility-first approach

### ADR-015: Firestore Document Structure
**Status**: Accepted  
**Context**: Need to organize data efficiently.  
**Decision**: Flat collections with organisationId field (hardcoded to "default" in MVP).  
**Consequences**:
- Simple queries
- Easy to add multi-org later
- No subcollections for MVP

### ADR-016: Image Storage Strategy
**Status**: Accepted  
**Context**: Need to store product images.  
**Decision**: Firebase Storage, store URLs in Firestore documents.  
**Consequences**:
- Scalable storage
- Need to handle uploads server-side or with signed URLs
- Storage emulator for local dev

### ADR-017: Pricing Provider Abstraction
**Status**: Accepted  
**Context**: Want to support multiple AI providers.  
**Decision**: Abstract pricing logic behind provider interface, support Mock/OpenAI/Gemini.  
**Consequences**:
- Easy to add new providers
- Consistent API regardless of provider
- Mock provider for testing

### ADR-018: Server-Side Image Uploads
**Status**: Accepted  
**Context**: Security and Firebase Admin SDK.  
**Decision**: Upload images via backend API, not directly from browser.  
**Consequences**:
- More secure (no client-side Firebase config needed)
- Server handles Storage operations
- Additional API endpoint needed

### ADR-019: Deterministic Seeds
**Status**: Accepted  
**Context**: Need consistent test data.  
**Decision**: Seed script generates same data every time (using fixed seeds for random).  
**Consequences**:
- Reproducible local dev
- Easy to reset database
- Predictable test data

### ADR-020: No Database Migrations
**Status**: Accepted  
**Context**: MVP scope, Firestore is schema-less.  
**Decision**: No migration system, rely on seed script to reset.  
**Consequences**:
- Simpler setup
- Data loss on reset
- Need migrations for production (future)
