/**
 * Delete all products (inventory) from the database.
 * Use this to wipe wrong data before re-uploading correct inventory.
 *
 * Usage:
 *   npm run clear-inventory --workspace=@luxselle/server
 *   # or: npx tsx scripts/clear-inventory.ts
 *
 * For production Firestore, set FIREBASE_USE_EMULATOR=false and ensure
 * Firebase credentials are available (e.g. GOOGLE_APPLICATION_CREDENTIALS).
 */
process.env.FIREBASE_USE_EMULATOR = process.env.FIREBASE_USE_EMULATOR ?? 'true'

import { db } from '../src/config/firebase'

const BATCH_SIZE = 500 // Firestore batch limit

async function clearProducts() {
  const coll = db.collection('products')
  let totalDeleted = 0

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snapshot = await coll.limit(BATCH_SIZE).get()
    if (snapshot.empty) break

    const batch = db.batch()
    snapshot.docs.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
    totalDeleted += snapshot.docs.length
    console.log('Deleted', totalDeleted, 'products...')
  }

  console.log('Done. Total products deleted:', totalDeleted)
}

clearProducts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
