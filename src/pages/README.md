# Pages

One folder per app page. Each folder contains the main view and any page-specific components.

| Folder | Route | Purpose |
|--------|--------|---------|
| **Dashboard** | `/` | Overview and command bar |
| **Inventory** | `/inventory` | Product list and product detail drawer |
| **BuyBox** | `/buy-box` | Evaluator (evaluate products for buy box) |
| **SupplierHub** | `/supplier-hub` | Suppliers and CSV import |
| **Sourcing** | `/sourcing` | Sourcing requests |
| **BuyingList** | `/buying-list` | Buying list items |
| **Jobs** | `/jobs` | System jobs |

Shared UI (e.g. ErrorBoundary) lives in `src/components/`. API helpers and app config in `src/lib/`. Global styles in `src/styles/`.
