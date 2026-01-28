import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { env } from './env'

const useEmulator = env.FIREBASE_USE_EMULATOR

if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST =
    env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080'
  process.env.FIREBASE_STORAGE_EMULATOR_HOST =
    env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199'
}

const projectId = env.FIREBASE_PROJECT_ID
const storageBucket = env.FIREBASE_STORAGE_BUCKET

const adminApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({
        projectId,
        storageBucket,
      })

const db = getFirestore(adminApp)
db.settings({ ignoreUndefinedProperties: true })

const storage = getStorage(adminApp)

export { adminApp, db, storage }
