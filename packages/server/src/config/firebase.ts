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
      console.log('Parsing Firebase service account credentials...')
      const serviceAccount = JSON.parse(env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
      console.log('Firebase service account parsed successfully. Project:', serviceAccount.project_id)
      credential = cert(serviceAccount)
    } catch (error) {
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', error)
      console.error('JSON length:', env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.length)
      console.error('First 100 chars:', env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.substring(0, 100))
      throw new Error('Invalid service account JSON')
    }
  } else if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Option 2: File path to service account JSON
    console.log('Using Firebase credentials from file path:', env.GOOGLE_APPLICATION_CREDENTIALS)
    credential = cert(env.GOOGLE_APPLICATION_CREDENTIALS)
  } else {
    // Option 3: Try Application Default Credentials (works in Google Cloud environments)
    console.warn('No explicit credentials provided. Attempting to use Application Default Credentials.')
  }
}

// Reuse existing app if already initialized (e.g. in tests)
let adminApp
let db
let storage

try {
  console.log('Initializing Firebase Admin SDK...')
  console.log('Project ID:', projectId)
  console.log('Storage Bucket:', storageBucket)
  console.log('Use Emulator:', useEmulator)

  adminApp = getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        credential,
        projectId,
        storageBucket,
      })

  console.log('Firebase Admin initialized successfully')

  db = getFirestore(adminApp)
  // Allow writing docs with undefined fields (they are omitted)
  db.settings({ ignoreUndefinedProperties: true })
  console.log('Firestore initialized')

  storage = getStorage(adminApp)
  console.log('Storage initialized')
} catch (error) {
  console.error('FATAL: Failed to initialize Firebase:', error)
  throw error
}

export { adminApp, db, storage }
