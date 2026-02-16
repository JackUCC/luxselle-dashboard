# Inventory products show €0 / "Missing info"

If products **do appear** on the Inventory page but **PURCHASE**, **CUSTOMS**, **VAT**, and **SELLING** are all **€0** and each row shows a **"Missing info"** tag, the app is working — the data in the database just has zero (or missing) prices.

---

## Why this happens

- The frontend reads **costPriceEur**, **sellPriceEur**, **customsEur**, **vatEur** from the API.
- The API returns exactly what is stored in **Firestore** (via the backend on Railway).
- So **€0** means those product documents in Firestore have **0** (or the field is missing and the schema default is 0).

Common causes:

1. Products were created with **Add Product** and the price fields were left at 0.
2. **E2E or seed** ran and created test products with 0 prices.
3. **Production Firestore** was never filled with real data (no PDF import and no seed with prices).

---

## Step-by-step: Check and fix

### 1. Confirm the API returns product data (Railway)

1. Open your **Railway** project → **Deployments** → latest deployment → **View Logs**.
2. Check for errors (e.g. Firebase init, 500s). You should see something like:  
   `Firebase Admin initialized (project: ..., emulator: false)`.
3. From your machine, call the API (replace with your real Railway URL):
   ```bash
   curl -s "https://YOUR-RAILWAY-URL.up.railway.app/api/products?limit=5"
   ```
4. You should get JSON with `data: [ { id, brand, model, costPriceEur, sellPriceEur, ... } ]`.  
   If **costPriceEur** and **sellPriceEur** are **0** in the response, the problem is the **data in Firestore**, not the frontend.

---

### 2. Railway environment variables (backend ↔ Firebase)

Railway must talk to **production Firebase** (not the emulator). In Railway → **Variables**:

| Variable | Value | Notes |
|----------|--------|------|
| **FIREBASE_USE_EMULATOR** | `false` | Must be `false` in production. If `true`, the backend talks to local emulator and production Firestore has no data. |
| **FIREBASE_PROJECT_ID** | Your Firebase project ID (e.g. `luxselle-dashboard`) | Must match Firebase Console. |
| **FIREBASE_STORAGE_BUCKET** | Your bucket (e.g. `luxselle-dashboard.firebasestorage.app`) | From Firebase Console → Project settings. |
| **GOOGLE_APPLICATION_CREDENTIALS_JSON** | Full service account JSON | Firebase Console → Project settings → Service accounts → Generate new private key. Paste the entire `{"type":"service_account",...}`. |

After changing any variable, **redeploy** the Railway service.

---

### 3. Vercel (frontend → backend)

The frontend must call your **Railway** API, not the Vercel host.

1. Vercel → your project → **Settings** → **Environment Variables**.
2. Add or edit:
   - **Name:** `VITE_API_BASE`
   - **Value:** `https://YOUR-RAILWAY-URL.up.railway.app` (no trailing slash, no `/api`).
   - Enable for **Production** (and **Preview** if you use it).
3. **Redeploy** the frontend (Deployments → ⋮ → Redeploy). Env vars are applied at **build** time.

If this is wrong or missing, the app may call the wrong backend or get HTML instead of JSON; fixing it ensures the Inventory page is loading product data from Railway/Firestore.

---

### 4. Firebase: confirm which project and data

1. **Firebase Console** → select the **same project** as in Railway (`FIREBASE_PROJECT_ID`).
2. Go to **Firestore Database**.
3. Open the **products** collection.  
   - If it’s empty, no products will show.  
   - If documents exist, open one and check fields: **costPriceEur**, **sellPriceEur**, **customsEur**, **vatEur**. If they’re 0 or missing, the UI will show €0 and "Missing info".

So: **products appear** = backend and Firestore are connected; **€0** = those documents have zero (or default) prices.

---

### 5. Fix the data: load real prices into Firestore

Pick one of these so that product documents have non-zero prices.

#### Option A: Import from the Luxselle inventory PDF (recommended)

1. **From the app (production):**  
   - Go to **Inventory** → **Import** → upload your **Luxselle inventory PDF**.  
   - The backend will create products with **brand**, **title**, **SKU**, **purchase**, **customs**, **VAT**, **selling price** from the PDF.

2. **From your machine (CLI):**  
   - Backend must be able to reach Firestore (e.g. same credentials as Railway, or run against production Firebase):
   ```bash
   cd /path/to/luxselle-dashboard
   FIREBASE_USE_EMULATOR=false INVENTORY_PDF_PATH="/path/to/Luxselle_Inventory_PDF.pdf" npm run import-inventory-pdf
   ```
   - Use the same Firebase project as Railway so the data appears in the same Firestore.

#### Option B: Seed demo data (non-zero prices)

If you prefer sample data with prices:

```bash
 FIREBASE_USE_EMULATOR=false npm run seed
 ```

This creates products with non-zero **costPriceEur** and **sellPriceEur**. Use the same Firebase project as production so the app shows them.

#### Option C: Edit products in the UI

- Open **Inventory** → click a product → edit **Purchase/Cost**, **Sell price**, **Customs**, **VAT** → **Save**.  
That updates the document in Firestore; refresh and the row should no longer show €0 or "Missing info" for those fields.

---

## Quick checklist

| Step | Where | What to verify |
|------|--------|----------------|
| 1 | Railway | Logs show Firebase init, no 500s. `GET /api/products` returns JSON with product objects. |
| 2 | Railway | `FIREBASE_USE_EMULATOR=false`, correct `FIREBASE_PROJECT_ID`, `GOOGLE_APPLICATION_CREDENTIALS_JSON`. |
| 3 | Vercel | `VITE_API_BASE` = Railway URL (no trailing slash). Redeploy after change. |
| 4 | Firebase | Firestore **products** collection exists; documents have **costPriceEur**, **sellPriceEur** (and optionally **customsEur**, **vatEur**). |
| 5 | Data | Import PDF or run seed (or edit in UI) so at least some products have non-zero prices. |

Once Firestore has products with non-zero prices and the same project is used by Railway (and the frontend points to Railway), the Inventory page will show **PURCHASE**, **CUSTOMS**, **VAT**, and **SELLING** correctly and "Missing info" will disappear for those products.
