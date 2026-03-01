/**
 * Firebase Admin SDK: initialize App, Firestore, and Storage.
 * When FIREBASE_USE_EMULATOR is true, points Firestore and Storage to local emulator hosts.
 * For production, uses service account credentials from GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS_JSON.
 * @see docs/CODE_REFERENCE.md
 * References: firebase-admin (app, firestore, storage)
 */
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { z } from 'zod'
import { env } from './env'

const useEmulator = env.FIREBASE_USE_EMULATOR

// Point SDK at local emulators when FIREBASE_USE_EMULATOR is true
if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST =
    env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8082'
  process.env.FIREBASE_STORAGE_EMULATOR_HOST =
    env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9198'
}

const projectId = env.FIREBASE_PROJECT_ID
const storageBucket = env.FIREBASE_STORAGE_BUCKET

// Prepare credentials for production
let credential: ReturnType<typeof cert> | undefined
let credentialStrategy: 'emulator' | 'service-account-json' | 'application-default-env-path' | 'application-default-fallback' = 'application-default-fallback'

const FirebaseServiceAccountSchema = z.object({
  project_id: z.string().min(1),
  client_email: z.string().min(1),
  private_key: z.string().min(1),
})

if (!useEmulator) {
  if (env.GOOGLE_APPLICATION_CREDENTIALS_JSON && env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn(
      '[firebase] Both GOOGLE_APPLICATION_CREDENTIALS_JSON and GOOGLE_APPLICATION_CREDENTIALS are set. ' +
      'Using GOOGLE_APPLICATION_CREDENTIALS_JSON and ignoring GOOGLE_APPLICATION_CREDENTIALS.',
    )
  }

  if (env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const rawServiceAccount = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      const serviceAccount = FirebaseServiceAccountSchema.parse(rawServiceAccount)
      credential = cert(serviceAccount)
      credentialStrategy = 'service-account-json'
    } catch {
      throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON — check that it is valid JSON')
    }
  } else if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    credentialStrategy = 'application-default-env-path'
    console.log(
      '[firebase] GOOGLE_APPLICATION_CREDENTIALS is set. Using Application Default Credentials; ' +
      'the Admin SDK will load the credential file from this env var.',
    )
  } else {
    credentialStrategy = 'application-default-fallback'
    console.warn('[firebase] No Firebase credentials provided. Falling back to Application Default Credentials.')
  }
} else {
  credentialStrategy = 'emulator'
}

// Reuse existing app if already initialized (e.g. in tests)
const adminApp = getApps().length > 0
  ? getApps()[0]
  : initializeApp({
      ...(credential && { credential }),
      projectId,
      storageBucket,
    })

// Use secondary Firestore database when FIRESTORE_DATABASE_ID is set (e.g. eur3 instance).
// When using emulator, always use default database; emulator does not support named databases.
const databaseId =
  useEmulator ? undefined : (env.FIRESTORE_DATABASE_ID && env.FIRESTORE_DATABASE_ID !== '(default)'
    ? env.FIRESTORE_DATABASE_ID
    : undefined)
const db = databaseId ? getFirestore(adminApp, databaseId) : getFirestore(adminApp)

// Firestore allows settings() only once; guard so module reloads (e.g. vi.resetModules()) do not throw
const settingsKey = '__luxselle_firestore_settings_applied'
if (!(globalThis as Record<string, boolean>)[settingsKey]) {
  db.settings({ ignoreUndefinedProperties: true })
  ;(globalThis as Record<string, boolean>)[settingsKey] = true
}

const storage = getStorage(adminApp)

console.log(
  `Firebase Admin initialized (project: ${projectId}, emulator: ${useEmulator}${databaseId ? `, database: ${databaseId}` : ''}, credentialStrategy: ${credentialStrategy})`
)

export { adminApp, db, storage }
