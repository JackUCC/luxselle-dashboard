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
import { env } from './env'

const useEmulator = env.FIREBASE_USE_EMULATOR

// Point SDK at local emulators when FIREBASE_USE_EMULATOR is true
if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST =
    env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
  process.env.FIREBASE_STORAGE_EMULATOR_HOST =
    env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199'
}

const projectId = env.FIREBASE_PROJECT_ID
const storageBucket = env.FIREBASE_STORAGE_BUCKET

// Prepare credentials for production
let credential: ReturnType<typeof cert> | undefined

if (!useEmulator) {
  if (env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const serviceAccount = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      credential = cert(serviceAccount)
    } catch {
      throw new Error('Invalid GOOGLE_APPLICATION_CREDENTIALS_JSON — check that it is valid JSON')
    }
  } else if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = cert(env.GOOGLE_APPLICATION_CREDENTIALS)
  } else {
    console.warn('No Firebase credentials provided. Falling back to Application Default Credentials.')
  }
}

// Reuse existing app if already initialized (e.g. in tests)
const adminApp = getApps().length > 0
  ? getApps()[0]
  : initializeApp({
      ...(credential && { credential }),
      projectId,
      storageBucket,
    })

const db = getFirestore(adminApp)
db.settings({ ignoreUndefinedProperties: true })

const storage = getStorage(adminApp)

console.log(`Firebase Admin initialized (project: ${projectId}, emulator: ${useEmulator})`)

export { adminApp, db, storage }
