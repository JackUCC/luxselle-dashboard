# Inventory product fields and CSV/Excel import

This document is the single source of truth for product fields and how they map to CSV/Excel import.

## Product fields (inventory tracker)

### Required (must have)

| Field | Description | Notes |
|-------|-------------|--------|
| brand | Brand name | e.g. Chanel, Louis Vuitton |
| model | Model / product name | e.g. Classic Flap, Neverfull |
| costPriceEur | Cost in EUR | Number (e.g. 1200) |
| sellPriceEur | Selling price in EUR | Number (e.g. 1800) |
| status | Stock status | One of: in_stock, sold, reserved |

At least **brand** or **model** must be non-empty; the app defaults the other to `"Unknown"` if missing. For a proper listing you want both.

### Optional (recommended for good data)

| Field | Description | Default |
|-------|-------------|---------|
| category | e.g. handbag, tote, clutch | "" |
| condition | e.g. new, excellent, good, fair | "" |
| colour | e.g. black, gold, blue | "" |
| quantity | Number in stock (integer ≥ 0) | 1 |
| sku | Stock-keeping unit / reference code | "" |
| title | Full product title (e.g. from invoice) | "" (display falls back to model) |
| notes | Free text | "" |

### Optional (pricing/tax)

| Field | Description | Default |
|-------|-------------|---------|
| customsEur | Customs amount in EUR | 0 |
| vatEur | VAT amount in EUR (on selling price) | 0 |
| currency | Currency code | EUR (only EUR is used in the schema) |

### System / UI-only (not filled per product from CSV)

- **images** / **imageUrls** – set by the app (upload or import), not required for CSV.
- **organisationId**, **createdAt**, **updatedAt** – set by the app.

## Status values

- **in_stock** – available to sell
- **sold** – sold
- **reserved** – reserved

If you don't provide status, the importer uses **in_stock** and forces **sold** when quantity is 0.

## CSV/Excel import – column names

For CSV or Excel upload, the importer matches columns by **normalized header** (trimmed, lowercased). It recognizes these (and similar) names:

| Our field | CSV column names that work (examples) |
|-----------|--------------------------------------|
| brand | Brand, brand, Brand Name |
| model | Model, model, Product Name, Title |
| category | Category, category |
| condition | Condition, condition |
| colour | Colour, Color, colour |
| costPriceEur | Cost EUR, Cost, Cost Price, Invoice Price, costPriceEur |
| sellPriceEur | Sell EUR, Sell, Sell Price, Price, sellPriceEur |
| quantity | Quantity, Qty, quantity |
| status | Status, status (values: in_stock, sold, reserved) |
| sku | SKU, sku, Reference |
| title | Title, Full Title, Product Title, Invoice Title (full product title; Title also used for model) |
| notes | Notes, notes, Remarks |
| customsEur | Customs EUR, Customs, customsEur |
| vatEur | VAT EUR, VAT, vatEur |

**Minimum for import:** A header row plus at least **Brand** or **Model**. For proper pricing and filtering, include Cost EUR, Sell EUR, Category, Condition, Colour, and Status where you have them.

### Example CSV header row

```text
Brand,Model,Category,Condition,Colour,Cost EUR,Sell EUR,Quantity,Status
```

With optional columns:

```text
Brand,Model,Category,Condition,Colour,Cost EUR,Sell EUR,Quantity,Status,SKU,Title,Notes,Customs EUR,VAT EUR
```

## Summary

- **Required:** brand, model, costPriceEur, sellPriceEur, status (with at least brand or model non-empty).
- **Optional details:** category, condition, colour, quantity, sku, title, notes, and (if relevant) customsEur, vatEur.
- **System-set:** images/imageUrls, organisationId, createdAt, updatedAt.

See also: [packages/shared/src/schemas/product.ts](../packages/shared/src/schemas/product.ts), [packages/server/src/routes/products.ts](../packages/server/src/routes/products.ts) (`POST /import`).
