/**
 * Firebase Admin SDK: initialize App, Firestore, and Storage.
 * When FIREBASE_USE_EMULATOR is true, points Firestore and Storage to local emulator hosts.
 * @see docs/CODE_REFERENCE.md
 * References: firebase-admin (app, firestore, storage)
 */
import { initializeApp, getApps } from 'firebase-admin/app'
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

// Reuse existing app if already initialized (e.g. in tests)
const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        projectId,
        storageBucket,
      })

const db = getFirestore(adminApp)
// Allow writing docs with undefined fields (they are omitted)
db.settings({ ignoreUndefinedProperties: true })

const storage = getStorage(adminApp)

export { adminApp, db, storage }
