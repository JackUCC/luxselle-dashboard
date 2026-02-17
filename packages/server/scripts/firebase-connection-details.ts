/**
 * Print what Firebase the server is configured to use (env) and what it connects to (after init).
 * Run from repo root: npm run firebase-connection-details --workspace=@luxselle/server
 * Or with production: FIREBASE_USE_EMULATOR=false npx tsx scripts/firebase-connection-details.ts
 */
import { env } from '../src/config/env'
import { adminApp } from '../src/config/firebase'

const projectIdFromApp = (adminApp as { options?: { projectId?: string } }).options?.projectId

console.log('--- Firebase connection details ---\n')
console.log('Configured (from env — what it should use):')
console.log('  FIREBASE_PROJECT_ID     ', env.FIREBASE_PROJECT_ID)
console.log('  FIREBASE_STORAGE_BUCKET ', env.FIREBASE_STORAGE_BUCKET)
console.log('  FIREBASE_USE_EMULATOR    ', env.FIREBASE_USE_EMULATOR)
console.log('  FIRESTORE_DATABASE_ID   ', env.FIRESTORE_DATABASE_ID ?? '(default)')
console.log('  Credentials:')
console.log('    GOOGLE_APPLICATION_CREDENTIALS_JSON ', env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? 'set (length ' + env.GOOGLE_APPLICATION_CREDENTIALS_JSON.length + ')' : 'not set')
console.log('    GOOGLE_APPLICATION_CREDENTIALS    ', env.GOOGLE_APPLICATION_CREDENTIALS || '(not set)')
if (env.FIREBASE_USE_EMULATOR) {
  console.log('  Emulator hosts:')
  console.log('    FIRESTORE_EMULATOR_HOST         ', process.env.FIRESTORE_EMULATOR_HOST ?? '(default 127.0.0.1:8082)')
  console.log('    FIREBASE_STORAGE_EMULATOR_HOST ', process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '(default 127.0.0.1:9198)')
}

console.log('\nActually connected to (Firebase Admin app after init):')
console.log('  projectId               ', projectIdFromApp ?? '(unknown)')
console.log('  Firestore database      ', env.FIRESTORE_DATABASE_ID && env.FIRESTORE_DATABASE_ID !== '(default)' ? env.FIRESTORE_DATABASE_ID : '(default)')
console.log('  emulator                ', env.FIREBASE_USE_EMULATOR)

const match = projectIdFromApp === env.FIREBASE_PROJECT_ID
console.log('\nMatch: configured project ID and connected project ID', match ? 'match.' : 'do NOT match.')
