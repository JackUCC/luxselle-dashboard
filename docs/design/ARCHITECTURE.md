# Luxselle Dashboard - Architecture Document

## System Overview

The Luxselle Dashboard is a full-stack application built with:
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js/Express API server
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Local Development**: Firebase Emulator Suite

## Production deployment

The frontend is built as a **static Vite app** and is typically deployed to **Vercel** (or any static host). Only the client bundle is deployed; there is **no backend on Vercel**. The Express API must run elsewhere (e.g. Railway, Render, or a separate serverless project). Build-time env vars (`VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_API_BASE`) are baked into the client; `VITE_API_BASE` must point to the live API URL so that all `/api` requests go to the backend. Image flow: product images are uploaded via the API (multer + sharp) to **Firebase Storage**; the API returns public URLs (`https://storage.googleapis.com/{bucket}/{path}`). The frontend displays those URLs; for production, the Storage bucket must have CORS configured to allow the frontend origin. See [docs/deploy/VERCEL.md](../deploy/VERCEL.md) and [docs/firebase/FIREBASE_SETUP.md](../firebase/FIREBASE_SETUP.md).

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Dashboard │  │Inventory │  │Evaluator │  │ Supplier │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  │
│       │             │              │              │         │
│  ┌────┴──────────────────────────────────────────┴─────┐  │
│  │         Shared Components & Hooks                     │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────┬────────────────────────────────────┘
                        │ HTTP/REST
┌───────────────────────┴────────────────────────────────────┐
│                    Backend API Server                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Routes     │  │  Services    │  │   Repos      │   │
│  │  /api/*      │  │  Pricing     │  │  Firestore   │   │
│  │              │  │  Import      │  │  Storage     │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                 │                  │            │
│  ┌──────┴─────────────────┴──────────────────┴───────┐   │
│  │         Firebase Admin SDK                         │   │
│  └────────────────────────────────────────────────────┘   │
└───────────────────────┬────────────────────────────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
┌───────▼────────┐            ┌─────────▼────────┐
│ Firebase       │            │ Firebase         │
│ Firestore      │            │ Storage          │
│ (Emulator)     │            │ (Emulator)       │
└────────────────┘            └──────────────────┘
```

## Directory Structure

```
luxselle-dashboard/
├── docs/                    # Documentation
│   ├── PRD.md
│   ├── PLAN.md
│   ├── STATUS_AND_PLAN.md
│   ├── design/
│   │   ├── ARCHITECTURE.md
│   │   └── DECISIONS.md
│   └── firebase/
│       ├── FIREBASE_SETUP.md
│       └── FIREBASE_QUICK_REF.md
├── src/                     # Frontend source
│   ├── components/          # React components
│   │   ├── common/          # Shared components
│   │   ├── dashboard/
│   │   ├── inventory/
│   │   ├── evaluator/
│   │   ├── supplier/
│   │   ├── sourcing/
│   │   └── (buying-list removed; no route)
│   ├── hooks/               # React hooks
│   ├── lib/                 # Frontend utilities
│   │   ├── firebase.ts      # Firebase client config
│   │   └── api.ts           # API client
│   ├── types/               # TypeScript types (shared)
│   ├── App.tsx              # Main app component
│   └── main.tsx             # Entry point
├── server/                  # Backend source
│   ├── src/
│   │   ├── routes/          # Express routes
│   │   │   ├── pricing.ts
│   │   │   ├── products.ts
│   │   │   ├── suppliers.ts
│   │   │   ├── dashboard.ts
│   │   │   └── sourcing.ts
│   │   ├── services/       # Business logic
│   │   │   ├── pricing/
│   │   │   │   ├── providers/
│   │   │   │   │   └── OpenAIProvider.ts
│   │   │   │   └── PricingService.ts
│   │   │   ├── ai/
│   │   │   │   ├── AiRouter.ts
│   │   │   │   ├── noFabrication.ts
│   │   │   │   └── prompts/
│   │   │   │       ├── assistantPrompts.ts
│   │   │   │       ├── searchPrompts.ts
│   │   │   │       ├── priceCheckPrompts.ts
│   │   │   │       ├── pricingPrompts.ts
│   │   │   │       └── marketResearchPrompts.ts
│   │   │   └── import/
│   │   │       └── SupplierImportService.ts
│   │   ├── repos/          # Data access layer
│   │   │   ├── BaseRepo.ts
│   │   │   ├── ProductRepo.ts
│   │   │   ├── SupplierRepo.ts
│   │   │   ├── SupplierItemRepo.ts
│   │   │   ├── TransactionRepo.ts
│   │   │   └── ...
│   │   ├── config/         # Configuration
│   │   │   ├── firebase.ts # Firebase Admin init
│   │   │   └── env.ts      # Environment validation
│   │   └── server.ts       # Express app setup
│   ├── scripts/
│   │   └── seed.ts         # Seed script
│   └── package.json
├── shared/                  # Shared code (Zod schemas; npm workspace)
│   └── src/
│       ├── index.ts
│       └── schemas/         # Zod schemas (product, supplier, buyingListItem, etc.)
├── firebase.json            # Firebase emulator config
├── firestore.rules          # Firestore security rules
├── firestore.indexes.json   # Firestore indexes
├── .env.example             # Environment template
└── package.json             # Root package.json (npm workspaces: server, shared)
```

**Note:** This repo uses **npm workspaces** (not pnpm). Types and validation live in `shared/src/schemas/` (Zod); there is no `server/models/` directory.

## Data Flow

### 1. Product Creation Flow
```
User Input → Frontend Form → POST /api/products
  → ProductService → ProductRepo → Firestore
  → ActivityEventRepo (log event)
  → Response → Frontend updates UI
```

### 2. Evaluation Flow
```
User Input → Frontend Form → POST /api/pricing/analyse
  → PricingService → PricingProvider (Mock/OpenAI/Gemini)
  → TransactionRepo (query history)
  → Response (estimatedRetail, maxBuyPrice, etc.)
  → Frontend displays results
  → (Buying list feature removed; no add-to-buying-list flow.)
```

### 3. Supplier Import Flow
```
User uploads CSV → POST /api/suppliers/import
  → SupplierImportService:
    1. Parse CSV
    2. Map columns (Brand Street Tokyo format)
    3. Convert USD to EUR using settings.fxUsdToEur
    4. Create/update SupplierItems in Firestore
    5. Create SystemJob record
    6. Create ActivityEvent
  → Response → Frontend shows import results
```

## Firebase Structure

### Firestore Collections (all scoped by organisationId = "default")

```
organisations/{orgId}/
  └── (not used in MVP, but structure ready)

products/{productId}
suppliers/{supplierId}
supplier_items/{itemId}
sourcing_requests/{requestId}
transactions/{transactionId}
evaluations/{evaluationId}
activity_events/{eventId}
settings/{orgId}  # Single doc per org
system_jobs/{jobId}
```

### Indexes Required
- `products`: brand, status, createdAt (for filtering)
- `supplier_items`: supplierId, availability, lastSeenAt
- `transactions`: productId, type, occurredAt
- `activity_events`: createdAt (descending for feed)

## API Endpoints

### Products
- `GET /api/products` - List products (with filters)
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/images` - Upload images (not yet implemented)

### Pricing
- `POST /api/pricing/analyse` - Run pricing analysis

### Suppliers
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier
- `GET /api/suppliers/items/all` - Unified supplier items feed (define before `/:id`)
- `GET /api/suppliers/:id/items` - Get supplier items
- `POST /api/suppliers/import` - Import CSV

### Sourcing
- `GET /api/sourcing` - List sourcing requests
- `GET /api/sourcing/:id` - Get sourcing request
- `POST /api/sourcing` - Create sourcing request
- `PUT /api/sourcing/:id` - Update sourcing request
- `DELETE /api/sourcing/:id` - Delete sourcing request

### Dashboard
- `GET /api/dashboard/kpis` - Get KPI values
- `GET /api/dashboard/activity` - Get recent activity (limit query)
- `GET /api/dashboard/status` - System status (AI provider, Firebase mode, last import)

### Health
- `GET /api/health` - Health check

## Type Safety Strategy

1. **Shared Zod Schemas**: Define schemas in `shared/src/schemas/`
2. **Type Inference**: Use `z.infer<typeof schema>` for TypeScript types
3. **Validation**: Validate on API boundaries (request/response)
4. **Firestore**: Use typed repos with schema validation on write

## Error Handling

- API errors return consistent format: `{ "error": { "code": string, "message": string, "details"?: object } }`
- Express error middleware ensures async route errors are caught and returned in this shape
- Frontend: toasts for user-facing errors; error boundaries for React errors (Phase 7 polish)
- Logging: console for dev, structured logging for production (future)

## Testing Strategy

- **Unit Tests**: Services, repos, utilities
- **Integration Tests**: API endpoints with emulator
- **E2E Tests**: Critical flows (evaluator → buy list → receive)

## Security Considerations (MVP)

- No auth in MVP (single org "default")
- Firestore rules: allow all reads/writes for "default" org (emulator only)
- API: No auth middleware (add in future iterations)
- File uploads: Validate file types, size limits

## Performance Considerations

- Pagination for large lists (products, supplier items)
- Indexes on frequently queried fields
- Image optimization: Store thumbnails in Storage
- Caching: Consider React Query for frontend (future)

## Deployment (Future)

- Frontend: Vercel/Netlify
- Backend: Vercel Functions / Railway / Render
- Firebase: Real project (not emulator)
- CI/CD: GitHub Actions
