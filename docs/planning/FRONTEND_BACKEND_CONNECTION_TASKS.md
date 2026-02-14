# Frontend-Backend Connection & Cleanup - Agent Task List

**Created**: 2026-02-14  
**Status**: Planning Phase  
**Goal**: Clean up codebase and ensure frontend is properly connected to backend with reliable data loading

---

## Executive Summary

This document provides a comprehensive breakdown of agents and tasks required to:
1. Clean up the codebase (remove unused code, fix inconsistencies)
2. Ensure frontend-backend connection is robust
3. Verify data loading works reliably across all pages
4. Document and fix any gaps in the data flow

---

## Agent Responsibility Matrix

| Agent | Primary Focus | Dependencies | Success Criteria |
|-------|---------------|--------------|------------------|
| **Backend Contracts QA** | API validation, endpoint testing | None | All endpoints respond correctly, schemas validated |
| **Frontend Flows QA** | Page-by-page data loading verification | Backend Contracts QA | All pages load data, handle errors gracefully |
| **Dashboard Agent** | Dashboard page data flow | Backend/Frontend QA | KPIs, activity feed, profit data loads correctly |
| **Inventory Agent** | Inventory page & drawer functionality | Backend/Frontend QA | Products list, detail drawer, transactions work |
| **Evaluator Agent** | BuyBox page & pricing analysis | Backend/Frontend QA | Pricing analysis, image upload, add-to-list work |
| **Supplier Hub Agent** | Supplier data & CSV import | Backend/Frontend QA | Suppliers list, items feed, import functional |
| **Buying List Agent** | Buy list & receive flow | Backend/Frontend QA | Buy list CRUD, receive-to-inventory works |
| **Sourcing Agent** | Sourcing requests management | Backend/Frontend QA | Sourcing CRUD, status transitions work |
| **Jobs Agent** | System jobs monitoring | Backend/Frontend QA | Jobs list, retry functionality works |
| **Invoices Agent** | Invoice management | Backend/Frontend QA | Invoice list and creation work |
| **Quality Lead** | Overall orchestration & sign-off | All agents | Release readiness achieved |
| **Docs Improvement** | Documentation updates | All technical work | Docs reflect current state |

---

## Phase 1: Backend Validation (Backend Contracts QA Agent)

**Objective**: Ensure all backend APIs are functional, properly documented, and return expected data

### Task 1.1: API Health Check
- [ ] Test `/api/health` endpoint
- [ ] Verify server starts without errors
- [ ] Confirm Firebase emulator connection
- [ ] Test production Firebase connection (if configured)

### Task 1.2: Products API Validation
- [ ] `GET /api/products` - List with pagination, filters, search
- [ ] `GET /api/products/:id` - Single product retrieval
- [ ] `POST /api/products` - Create product
- [ ] `PUT /api/products/:id` - Update product
- [ ] `DELETE /api/products/:id` - Delete product
- [ ] `POST /api/products/:id/images` - Image upload
- [ ] `DELETE /api/products/:id/images/:imageId` - Image deletion
- [ ] `GET /api/products/:id/transactions` - Transaction history
- [ ] `POST /api/products/:id/transactions` - Create transaction

**Success Criteria**: All endpoints return correct status codes, proper error messages, and valid data schemas

### Task 1.3: Suppliers API Validation
- [ ] `GET /api/suppliers` - List with pagination
- [ ] `GET /api/suppliers/:id` - Single supplier
- [ ] `POST /api/suppliers` - Create supplier
- [ ] `PUT /api/suppliers/:id` - Update supplier
- [ ] `DELETE /api/suppliers/:id` - Delete supplier
- [ ] `GET /api/suppliers/items/all` - Unified items feed with filters
- [ ] `GET /api/suppliers/:id/items` - Items for specific supplier
- [ ] `POST /api/suppliers/import` - CSV import

**Success Criteria**: All endpoints functional, CSV import handles edge cases, filters work correctly

### Task 1.4: Buying List API Validation
- [ ] `GET /api/buying-list` - List with pagination
- [ ] `GET /api/buying-list/:id` - Single item
- [ ] `POST /api/buying-list` - Create item
- [ ] `PUT /api/buying-list/:id` - Update item
- [ ] `DELETE /api/buying-list/:id` - Delete item
- [ ] `POST /api/buying-list/:id/receive` - Receive into inventory (atomic transaction)

**Success Criteria**: CRUD operations work, receive flow is atomic and creates product correctly

### Task 1.5: Pricing API Validation
- [ ] `POST /api/pricing/analyse` - Analyze product pricing
- [ ] `POST /api/pricing/analyze-image` - AI vision analysis
- [ ] Test with different AI providers (mock, OpenAI, Gemini)
- [ ] Verify error handling for invalid inputs

**Success Criteria**: Pricing analysis returns valid data, handles all AI providers

### Task 1.6: Dashboard API Validation
- [ ] `GET /api/dashboard/kpis` - KPIs calculation
- [ ] `GET /api/dashboard/profit-summary` - Profit metrics
- [ ] `GET /api/dashboard/activity` - Activity feed
- [ ] `GET /api/dashboard/status` - System status

**Success Criteria**: All metrics calculated correctly, activity feed returns recent events

### Task 1.7: Sourcing API Validation
- [ ] `GET /api/sourcing` - List with pagination
- [ ] `GET /api/sourcing/:id` - Single request
- [ ] `POST /api/sourcing` - Create request
- [ ] `PUT /api/sourcing/:id` - Update with status validation
- [ ] `DELETE /api/sourcing/:id` - Delete request

**Success Criteria**: Status transitions validated, all CRUD operations work

### Task 1.8: Jobs API Validation
- [ ] `GET /api/jobs` - List jobs with filters
- [ ] `GET /api/jobs/:id` - Job details
- [ ] `POST /api/jobs/:id/retry` - Retry failed job
- [ ] `POST /api/jobs/:id/cancel` - Cancel job

**Success Criteria**: Job monitoring functional, retry works correctly

### Task 1.9: Invoices & VAT API Validation
- [ ] `GET /api/invoices` - List invoices
- [ ] `POST /api/invoices` - Create invoice
- [ ] `GET /api/vat/calculate` - VAT calculation
- [ ] Test settings API for user preferences

**Success Criteria**: All endpoints functional with proper validation

### Task 1.10: Error Handling & Edge Cases
- [ ] Test invalid inputs (malformed JSON, missing fields)
- [ ] Test non-existent resource IDs (404 responses)
- [ ] Test duplicate operations (idempotency where applicable)
- [ ] Test pagination edge cases (empty results, last page)
- [ ] Test authentication (when enabled)
- [ ] Test CORS configuration

**Success Criteria**: All errors return proper API error format, no unhandled exceptions

---

## Phase 2: Frontend Connection Validation (Frontend Flows QA Agent)

**Objective**: Verify each page properly connects to backend and loads data

### Task 2.1: API Client Configuration
- [ ] Verify `API_BASE` configuration in `src/lib/api.ts`
- [ ] Test API client error handling
- [ ] Verify VITE_API_BASE environment variable
- [ ] Test production vs development configuration
- [ ] Validate CORS handling in fetch requests

**Success Criteria**: API client properly configured for all environments

### Task 2.2: React Query Setup
- [ ] Verify QueryClient configuration
- [ ] Test cache invalidation strategies
- [ ] Verify retry logic for failed requests
- [ ] Test stale-while-revalidate behavior
- [ ] Validate loading and error states

**Success Criteria**: React Query properly configured with sensible defaults

### Task 2.3: Common Component Testing
- [ ] Test LoadingSpinner displays during data fetching
- [ ] Test ErrorDisplay shows proper error messages
- [ ] Test EmptyState components with correct messaging
- [ ] Test Toast notifications for success/error
- [ ] Test form validation across the app

**Success Criteria**: All common components work correctly across pages

---

## Phase 3: Page-by-Page Validation (Page-Specific Agents)

### Task 3.1: Dashboard Page (Dashboard Agent)

**Data Loading**:
- [ ] KPIs load correctly (inventory value, buy list, sourcing, low stock)
- [ ] Profit summary calculates correctly
- [ ] Activity feed shows recent events
- [ ] System status displays current configuration
- [ ] Low stock alerts show correct products

**UI/UX**:
- [ ] Loading states display during fetch
- [ ] Error states show helpful messages
- [ ] Empty states guide user actions
- [ ] KPI cards are clickable and navigate correctly
- [ ] Refresh data works without page reload

**Success Criteria**: Dashboard loads within 2s, all metrics accurate, navigation works

### Task 3.2: Inventory Page (Inventory Agent)

**Data Loading**:
- [ ] Products list loads with pagination
- [ ] Search and filters work correctly
- [ ] Table virtualization works for large datasets
- [ ] Product detail drawer loads full product data
- [ ] Transaction history loads in drawer
- [ ] Images load correctly with thumbnails

**UI/UX**:
- [ ] Grid/list toggle works
- [ ] Sorting by different columns works
- [ ] Inline editing saves correctly
- [ ] Image upload and deletion work
- [ ] CSV export generates correct data
- [ ] Record sale/adjustment transaction works
- [ ] Loading states for all async operations

**Success Criteria**: Inventory page performs well with 100+ products, all CRUD operations work

### Task 3.3: BuyBox/Evaluator Page (Evaluator Agent)

**Data Loading**:
- [ ] Brand/model dropdowns populate from backend
- [ ] Smart filtering works (brand → models → years)
- [ ] Pricing analysis returns valid data
- [ ] Image upload with AI vision works
- [ ] Comparable products load correctly

**UI/UX**:
- [ ] Form validation works correctly
- [ ] Loading state during analysis
- [ ] Results display clearly
- [ ] Add to buy list works with pre-filled data
- [ ] Error handling for failed analysis
- [ ] Image preview works

**Success Criteria**: Pricing analysis completes in <5s, add-to-buy-list flow seamless

### Task 3.4: Supplier Hub Page (Supplier Hub Agent)

**Data Loading**:
- [ ] Suppliers list loads with pagination
- [ ] Supplier items feed loads all items
- [ ] Filters work (supplier, brand, availability)
- [ ] Search works across suppliers and items
- [ ] CSV import uploads and processes correctly
- [ ] Import job status updates

**UI/UX**:
- [ ] Filter persistence in URL parameters
- [ ] Add to buy list from supplier items works
- [ ] Import progress shows feedback
- [ ] Error handling for failed imports
- [ ] Empty states guide user
- [ ] Bulk actions work (if implemented)

**Success Criteria**: Supplier hub handles 1000+ items, CSV import reliable

### Task 3.5: Buying List Page (Buying List Agent)

**Data Loading**:
- [ ] Buy list items load with pagination
- [ ] Filter by status works
- [ ] Group by supplier view works
- [ ] Message generator creates correct messages

**UI/UX**:
- [ ] Create new buy list item works
- [ ] Edit existing items works
- [ ] Receive flow creates product atomically
- [ ] Post-receive navigation to inventory works
- [ ] Delete items works with confirmation
- [ ] Bulk view shows items grouped correctly
- [ ] WhatsApp/Email links work correctly

**Success Criteria**: Receive flow is atomic, no orphaned data, navigation seamless

### Task 3.6: Sourcing Page (Sourcing Agent)

**Data Loading**:
- [ ] Sourcing requests load with pagination
- [ ] Filter by status works
- [ ] Search across requests works
- [ ] Status transitions validate correctly

**UI/UX**:
- [ ] Create new request works
- [ ] Edit request works
- [ ] Status change validation prevents invalid transitions
- [ ] Delete works with confirmation
- [ ] Link to product works
- [ ] Pipeline view shows status distribution

**Success Criteria**: Status workflow enforced, no invalid state transitions

### Task 3.7: Jobs Page (Jobs Agent)

**Data Loading**:
- [ ] Jobs list loads with pagination
- [ ] Filter by status/type works
- [ ] Job details load correctly
- [ ] Progress tracking updates

**UI/UX**:
- [ ] Retry failed job works
- [ ] Cancel job works
- [ ] Job status updates in real-time (or with polling)
- [ ] Error messages show for failed jobs
- [ ] Empty state for no jobs

**Success Criteria**: Jobs monitoring provides visibility, retry mechanism works

### Task 3.8: Invoices Page (Invoices Agent)

**Data Loading**:
- [ ] Invoices list loads with pagination
- [ ] Search and filters work
- [ ] Invoice creation from product works

**UI/UX**:
- [ ] Create invoice flow is clear
- [ ] Invoice detail view works
- [ ] PDF generation works (when implemented)
- [ ] Delete works with confirmation

**Success Criteria**: Invoice management works end-to-end

---

## Phase 4: Integration Testing (Frontend Flows QA Agent)

**Objective**: Test complete user journeys across multiple pages

### Task 4.1: Evaluator → Buy List → Inventory Flow
- [ ] Start in Evaluator, analyze product
- [ ] Add to buy list with pricing data
- [ ] Navigate to buying list, verify item exists
- [ ] Receive item, verify atomic transaction
- [ ] Navigate to inventory, verify product exists
- [ ] Verify all data persists correctly

**Success Criteria**: Complete flow works without data loss or errors

### Task 4.2: Supplier Hub → Buy List → Inventory Flow
- [ ] Import CSV to supplier hub
- [ ] Add supplier item to buy list
- [ ] Receive item into inventory
- [ ] Verify product has supplier reference

**Success Criteria**: Supplier data flows correctly through system

### Task 4.3: Sourcing → Buy List → Inventory Flow
- [ ] Create sourcing request
- [ ] Find matching supplier item
- [ ] Add to buy list
- [ ] Receive and link to sourcing request
- [ ] Update sourcing status to "Sourced"

**Success Criteria**: Sourcing workflow complete, status updates correctly

### Task 4.4: Inventory → Transaction → Dashboard Flow
- [ ] Record sale transaction in inventory
- [ ] Navigate to dashboard
- [ ] Verify profit summary updated
- [ ] Verify activity feed shows transaction
- [ ] Verify KPIs updated

**Success Criteria**: Dashboard reflects real-time changes from inventory

### Task 4.5: Cross-Page Navigation
- [ ] Test all navigation links work
- [ ] Test browser back/forward buttons
- [ ] Test deep linking (share URL, reload page)
- [ ] Test URL parameters persist correctly
- [ ] Test navigation preserves unsaved form data (with warning)

**Success Criteria**: Navigation is seamless, no broken links

---

## Phase 5: Cleanup & Code Quality (Quality Lead Agent)

**Objective**: Remove unused code, fix inconsistencies, improve code quality

### Task 5.1: Backend Cleanup
- [ ] Remove unused imports
- [ ] Remove commented-out code
- [ ] Consolidate duplicate utility functions
- [ ] Fix TypeScript any types
- [ ] Add missing JSDoc comments
- [ ] Verify all error paths are tested
- [ ] Check for console.log statements (replace with logger)

### Task 5.2: Frontend Cleanup
- [ ] Remove unused components
- [ ] Remove unused imports
- [ ] Consolidate duplicate code
- [ ] Fix React key warnings
- [ ] Fix accessibility warnings
- [ ] Standardize component patterns
- [ ] Remove TODO comments or convert to issues

### Task 5.3: Schema & Type Validation
- [ ] Verify all Zod schemas are used
- [ ] Check for type inconsistencies between frontend/backend
- [ ] Ensure shared types are properly imported
- [ ] Validate all API responses match schemas

### Task 5.4: Configuration Review
- [ ] Verify .env.example is complete
- [ ] Document all environment variables
- [ ] Check for hardcoded values that should be configurable
- [ ] Verify emulator vs production config paths

### Task 5.5: Dependency Audit
- [ ] Run `npm audit` and address security issues
- [ ] Check for unused dependencies
- [ ] Update outdated dependencies (test after)
- [ ] Verify workspaces are configured correctly

**Success Criteria**: No linter errors, no TypeScript errors, no security warnings

---

## Phase 6: Performance & Optimization (Quality Lead Agent)

**Objective**: Ensure application performs well under realistic load

### Task 6.1: Frontend Performance
- [ ] Test with 500+ products in inventory
- [ ] Verify virtualization kicks in for large lists
- [ ] Check React Query cache is effective
- [ ] Measure page load times
- [ ] Check for memory leaks (DevTools)
- [ ] Optimize images (size, format, loading)

### Task 6.2: Backend Performance
- [ ] Test API response times under load
- [ ] Verify Firestore queries are optimized
- [ ] Check for N+1 query problems
- [ ] Test pagination with large datasets
- [ ] Verify proper indexing in Firestore

### Task 6.3: Network Optimization
- [ ] Verify API responses are compressed
- [ ] Check for unnecessary API calls
- [ ] Test on slow network (DevTools throttling)
- [ ] Verify proper caching headers

**Success Criteria**: Pages load <2s on 3G, handle 1000+ items smoothly

---

## Phase 7: Error Handling & Edge Cases (Frontend/Backend QA Agents)

**Objective**: Ensure robust error handling throughout

### Task 7.1: Network Error Scenarios
- [ ] Test offline mode (show helpful message)
- [ ] Test server unreachable
- [ ] Test timeout errors
- [ ] Test partial response errors
- [ ] Verify retry logic works

### Task 7.2: Data Validation Errors
- [ ] Test form validation on frontend
- [ ] Test API validation on backend
- [ ] Verify error messages are user-friendly
- [ ] Test edge cases (empty strings, null values, etc.)

### Task 7.3: Authentication Errors (when enabled)
- [ ] Test expired tokens
- [ ] Test invalid permissions
- [ ] Test anonymous access

### Task 7.4: Business Logic Errors
- [ ] Test invalid status transitions
- [ ] Test duplicate operations
- [ ] Test constraint violations
- [ ] Test atomic transaction failures

**Success Criteria**: All errors handled gracefully, no app crashes

---

## Phase 8: Documentation (Docs Improvement Agent)

**Objective**: Ensure documentation matches implementation

### Task 8.1: API Documentation
- [ ] Update API endpoint list
- [ ] Document request/response schemas
- [ ] Add example requests/responses
- [ ] Document error codes
- [ ] Update authentication docs (when enabled)

### Task 8.2: Setup Documentation
- [ ] Verify setup steps work from scratch
- [ ] Update environment variable documentation
- [ ] Document emulator setup
- [ ] Document production deployment
- [ ] Add troubleshooting section

### Task 8.3: Architecture Documentation
- [ ] Update architecture diagram
- [ ] Document data flow
- [ ] Document component hierarchy
- [ ] Update tech stack list

### Task 8.4: Developer Documentation
- [ ] Update code reference
- [ ] Document common patterns
- [ ] Add contributing guidelines
- [ ] Document testing strategy

**Success Criteria**: New developer can set up and understand system from docs

---

## Phase 9: Testing (All QA Agents)

**Objective**: Ensure comprehensive test coverage

### Task 9.1: Backend Unit Tests
- [ ] Test all repository methods
- [ ] Test service layer logic
- [ ] Test error handling
- [ ] Test edge cases
- [ ] Achieve >80% coverage

### Task 9.2: Frontend Component Tests
- [ ] Test common components
- [ ] Test form validation
- [ ] Test error states
- [ ] Test loading states

### Task 9.3: E2E Tests
- [ ] Expand existing Playwright tests
- [ ] Cover critical user journeys
- [ ] Test across different browsers
- [ ] Test mobile viewport

### Task 9.4: Integration Tests
- [ ] Test API endpoints with real Firebase (emulator)
- [ ] Test complete flows end-to-end
- [ ] Test concurrent operations

**Success Criteria**: All tests pass, critical paths covered

---

## Phase 10: Release Readiness (Quality Lead Agent)

**Objective**: Final validation before deployment

### Task 10.1: Pre-Release Checklist
- [ ] All tests passing
- [ ] All documentation updated
- [ ] No security vulnerabilities
- [ ] Performance benchmarks met
- [ ] All environments configured
- [ ] Deployment scripts tested
- [ ] Rollback plan documented

### Task 10.2: Production Validation
- [ ] Test against real Firebase
- [ ] Test with production API keys
- [ ] Verify CORS for production domains
- [ ] Test error reporting/monitoring
- [ ] Verify backup/restore procedures

### Task 10.3: User Acceptance Testing
- [ ] Run through all user scenarios
- [ ] Verify data integrity
- [ ] Test edge cases in production-like environment
- [ ] Confirm all requirements met

**Success Criteria**: System is production-ready, all stakeholders approve

---

## Success Metrics

### Data Loading Reliability
- ✅ 100% of API endpoints functional
- ✅ 100% of pages load data successfully
- ✅ <2s average page load time
- ✅ <500ms average API response time

### Code Quality
- ✅ 0 TypeScript errors
- ✅ 0 critical linter errors
- ✅ >80% test coverage
- ✅ 0 security vulnerabilities

### User Experience
- ✅ All critical user flows work end-to-end
- ✅ All error states handled gracefully
- ✅ All loading states provide feedback
- ✅ Navigation is intuitive and fast

### Documentation
- ✅ Setup docs are complete and accurate
- ✅ API docs match implementation
- ✅ All environment variables documented
- ✅ Troubleshooting guide available

---

## Agent Execution Order

1. **Backend Contracts QA Agent** - Validate all APIs (Phase 1)
2. **Frontend Flows QA Agent** - Validate API client and React Query setup (Phase 2)
3. **Page-Specific Agents** (parallel) - Validate each page (Phase 3)
   - Dashboard Agent
   - Inventory Agent
   - Evaluator Agent
   - Supplier Hub Agent
   - Buying List Agent
   - Sourcing Agent
   - Jobs Agent
   - Invoices Agent
4. **Frontend Flows QA Agent** - Integration testing (Phase 4)
5. **Quality Lead Agent** - Code cleanup and optimization (Phases 5-6)
6. **All QA Agents** - Error handling validation (Phase 7)
7. **Docs Improvement Agent** - Documentation updates (Phase 8)
8. **All QA Agents** - Testing (Phase 9)
9. **Quality Lead Agent** - Final release readiness (Phase 10)

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Backend Validation | 2-3 days | None |
| Phase 2: Frontend Connection | 1 day | Phase 1 |
| Phase 3: Page Validation | 3-4 days | Phase 2 |
| Phase 4: Integration Testing | 2 days | Phase 3 |
| Phase 5: Cleanup | 1-2 days | Phase 4 |
| Phase 6: Performance | 1 day | Phase 5 |
| Phase 7: Error Handling | 1-2 days | Phase 6 |
| Phase 8: Documentation | 1-2 days | Phases 1-7 |
| Phase 9: Testing | 2-3 days | Phases 1-8 |
| Phase 10: Release Readiness | 1 day | All phases |

**Total**: 15-21 working days (3-4 weeks)

---

## Quick Start Commands

```bash
# Install dependencies
npm install

# Start development environment (emulators + backend + frontend)
npm run dev

# Seed database (run after first start)
npm run seed

# Run backend tests
npm run test --workspace=@luxselle/server

# Build frontend
npm run build

# Run E2E tests
npm run test:e2e

# Check for security vulnerabilities
npm audit
```

---

## Notes

- This plan assumes the existing agent architecture is in place (see AGENT_TEAM.md)
- Tasks can be parallelized where noted to speed up execution
- Each phase should produce a report of findings and fixes
- Regular check-ins with Quality Lead agent to track overall progress
- Blockers should be escalated immediately
- All changes should be incremental and tested before moving to next phase
