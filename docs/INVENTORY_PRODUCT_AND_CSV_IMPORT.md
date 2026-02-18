# Inventory product fields and CSV/Excel import

This document is the single source of truth for product fields and how they map to CSV/Excel import.

## Product fields (inventory tracker)

### Required for import (at least one non-empty)

| Field | Description | Notes |
|-------|-------------|--------|
| brand | Brand name | e.g. Chanel, Louis Vuitton |
| model | Model / product name | e.g. Classic Flap, Neverfull |

At least **Brand** or **Model** must be non-empty; the app defaults the other to `"Unknown"` if missing. For a proper listing you want both.

### Stored from CSV (canonical columns)

| Field | Description | Default |
|-------|-------------|---------|
| category | e.g. handbag, tote, clutch | "" |
| condition | e.g. new, excellent, good, fair | "" |
| colour | e.g. black, gold, blue | "" |
| costPriceEur | Cost in EUR | 0 |
| vatEur | VAT amount in EUR | 0 |
| customsEur | Customs amount in EUR | 0 |
| sellPriceEur | Selling price in EUR | 0 |
| quantity | Number in stock (integer ≥ 0) | 1 |
| status | in_stock, sold, reserved | in_stock (or sold when quantity is 0) |
| sku | Stock-keeping unit / reference code | "" |
| notes | Free text | "" |

### Accepted but not stored (display/derived)

- **Landed EUR** – accepted in CSV; not stored (derived as Cost + VAT + Customs).
- **Margin EUR** – accepted in CSV; not stored (derived as Sell − Landed).
- **Margin %** – accepted in CSV; not stored (derived).

### System / UI-only (not filled from CSV)

- **images** / **imageUrls** – set by the app (upload after import or later). Image is handled separately.
- **organisationId**, **createdAt**, **updatedAt** – set by the app.
- **title** – optional full product title; CSV may not include it (display falls back to model).

## Status values

- **in_stock** – available to sell
- **sold** – sold
- **reserved** – reserved

If you don't provide status, the importer uses **in_stock** and forces **sold** when quantity is 0.

## CSV/Excel import – canonical format

Use this header row (column order can vary; matching is case-insensitive after trim):

```text
Brand,Model,Category,Condition,Colour,Cost EUR,VAT EUR,Customs EUR,Landed EUR,Sell EUR,Margin EUR,Margin %,Quantity,Status,SKU,Notes
```

The importer matches columns by **normalized header** (trimmed, lowercased). Recognized names:

| Our field | CSV column names (examples) |
|-----------|-----------------------------|
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
| title | Title, Full Title, Product Title, Invoice Title (optional) |
| notes | Notes, notes, Remarks |
| customsEur | Customs EUR, Customs, customsEur |
| vatEur | VAT EUR, VAT, vatEur |

Columns **Landed EUR**, **Margin EUR**, and **Margin %** are accepted and ignored for storage (values are derived from cost/VAT/customs/sell).

**Minimum for import:** A header row plus at least **Brand** or **Model**. For full data, use the canonical columns above. **Image** is not part of the CSV; add images after import via the product detail.

## Summary

- **Canonical CSV columns:** Brand, Model, Category, Condition, Colour, Cost EUR, VAT EUR, Customs EUR, Landed EUR, Sell EUR, Margin EUR, Margin %, Quantity, Status, SKU, Notes.
- **Required:** At least one of brand or model non-empty.
- **Image:** Handled separately (upload after import).
- **System-set:** images/imageUrls, organisationId, createdAt, updatedAt.

See also: [packages/shared/src/schemas/product.ts](../packages/shared/src/schemas/product.ts), [packages/server/src/lib/csvProductParser.ts](../packages/server/src/lib/csvProductParser.ts), [packages/server/src/routes/products.ts](../packages/server/src/routes/products.ts) (`POST /import`).
