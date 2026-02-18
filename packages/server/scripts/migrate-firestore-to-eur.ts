/**
 * Migrate Firestore data from (default) nam5 (US) to luxselle-dashboard-95977150 (eur3).
 *
 * Prerequisites:
 *   - FIREBASE_USE_EMULATOR=false (uses real Firebase)
 *   - GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS set
 *
 * Usage:
 *   FIREBASE_USE_EMULATOR=false npm run migrate-firestore-to-eur --workspace=@luxselle/server
 *
 * After migration:
 *   1. Set FIRESTORE_DATABASE_ID=luxselle-dashboard-95977150 in .env and Railway
 *   2. Restart the server
 *   3. Verify the app shows data correctly
 */
import dotenv from 'dotenv'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import type { Firestore } from 'firebase-admin/firestore'
import {
  getFirestore,
  DocumentReference,
  Timestamp,
  FieldValue,
} from 'firebase-admin/firestore'

dotenv.config()

const TARGET_DATABASE_ID = 'luxselle-dashboard-95977150'

const COLLECTIONS = [
  'activity_events',
  'buying_list_items',
  'evaluations',
  'products',
  'settings',
  'transactions',
  'suppliers',
  'supplier_items',
  'sourcing_requests',
  'system_jobs',
  'supplier_email_imports',
  'invoices',
  'idempotency_keys',
]

function isDocumentReference(v: unknown): v is DocumentReference {
  return v != null && typeof v === 'object' && 'path' in v && typeof (v as DocumentReference).path === 'string'
}

/** Recursively convert DocumentReferences to target DB refs. Other values pass through. */
function convertRefsForTarget(value: unknown, targetDb: Firestore): unknown {
  if (value == null) return value
  if (value instanceof Timestamp || value instanceof Date) return value
  if (value instanceof FieldValue) return value
  if (isDocumentReference(value)) {
    return targetDb.doc(value.path)
  }
  if (Array.isArray(value)) {
    return value.map((item) => convertRefsForTarget(item, targetDb))
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = convertRefsForTarget(v, targetDb)
    }
    return out
  }
  return value
}

async function migrateCollection(
  sourceDb: Firestore,
  targetDb: Firestore,
  collectionName: string
): Promise<{ count: number; errors: string[] }> {
  const sourceSnap = await sourceDb.collection(collectionName).get()
  let count = 0
  const errors: string[] = []

  // Firestore batch limit is 500
  const BATCH_SIZE = 400
  let batch = targetDb.batch()
  let batchCount = 0

  for (const doc of sourceSnap.docs) {
    try {
      const data = doc.data()
      const converted = convertRefsForTarget(data, targetDb) as Record<string, unknown>
      const targetRef = targetDb.collection(collectionName).doc(doc.id)
      batch.set(targetRef, converted, { merge: true })
      count++
      batchCount++
      if (batchCount >= BATCH_SIZE) {
        await batch.commit()
        batch = targetDb.batch()
        batchCount = 0
      }
    } catch (err) {
      errors.push(`${collectionName}/${doc.id}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }
  if (batchCount > 0) {
    await batch.commit()
  }
  return { count, errors }
}

async function main() {
  if (process.env.FIREBASE_USE_EMULATOR === 'true') {
    console.error('This script must run against real Firebase. Set FIREBASE_USE_EMULATOR=false')
    process.exit(1)
  }

  const projectId = process.env.FIREBASE_PROJECT_ID ?? 'luxselle-dashboard'
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

  let credential: ReturnType<typeof cert> | undefined
  if (credentialsJson) {
    try {
      credential = cert(JSON.parse(credentialsJson))
    } catch {
      console.error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON')
      process.exit(1)
    }
  } else if (credentialsPath) {
    credential = cert(credentialsPath)
  } else {
    console.error('Set GOOGLE_APPLICATION_CREDENTIALS_JSON or GOOGLE_APPLICATION_CREDENTIALS')
    process.exit(1)
  }

  const adminApp =
    getApps().length > 0
      ? getApps()[0]
      : initializeApp({
          credential,
          projectId,
        })

  const dbDefault = getFirestore(adminApp)
  const dbEur = getFirestore(adminApp, TARGET_DATABASE_ID)

  console.log('Firestore migration: (default) →', TARGET_DATABASE_ID)
  console.log('')

  let totalDocs = 0
  const allErrors: string[] = []

  for (const name of COLLECTIONS) {
    process.stdout.write(`  ${name}... `)
    try {
      const { count, errors } = await migrateCollection(dbDefault, dbEur, name)
      totalDocs += count
      if (errors.length > 0) {
        allErrors.push(...errors.map((e) => `  ${e}`))
        console.log(`${count} docs (${errors.length} errors)`)
      } else {
        console.log(`${count} docs`)
      }
    } catch (err) {
      console.log(`ERROR: ${err instanceof Error ? err.message : String(err)}`)
      allErrors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log('')
  console.log('Migration complete:', totalDocs, 'documents copied')
  if (allErrors.length > 0) {
    console.log('')
    console.log('Errors:')
    allErrors.slice(0, 20).forEach((e) => console.log(e))
    if (allErrors.length > 20) {
      console.log(`  ... and ${allErrors.length - 20} more`)
    }
  }
  console.log('')
  console.log('Next steps:')
  console.log('  1. Add FIRESTORE_DATABASE_ID=luxselle-dashboard-95977150 to .env and Railway')
  console.log('  2. Restart the server')
  console.log('  3. Verify the app shows data correctly')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
