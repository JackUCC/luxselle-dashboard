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
// In production, Firebase Admin SDK needs explicit credentials
// Support both JSON string and file path
let credential: ReturnType<typeof cert> | undefined

if (!useEmulator) {
  // Production: use service account credentials
  if (env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    // Option 1: JSON string from environment variable (recommended for Railway/Vercel)
    try {
      const serviceAccount = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      credential = cert(serviceAccount)
    } catch (error) {
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error)
      throw new Error('Invalid service account JSON')
    }
  } else if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Option 2: File path to service account JSON
    credential = cert(env.GOOGLE_APPLICATION_CREDENTIALS)
  } else {
    // Option 3: Try Application Default Credentials (works in Google Cloud environments)
    console.warn('No explicit credentials provided. Attempting to use Application Default Credentials.')
  }
}

// Reuse existing app if already initialized (e.g. in tests)
const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential,
        projectId,
        storageBucket,
      })

const db = getFirestore(adminApp)
// Allow writing docs with undefined fields (they are omitted)
db.settings({ ignoreUndefinedProperties: true })

const storage = getStorage(adminApp)

export { adminApp, db, storage }
