/// <reference types="vite/client" />

/** Firebase client config from env (projectId, storageBucket); used for auth/storage in frontend. @see docs/CODE_REFERENCE.md */
export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'luxselle-dashboard',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'luxselle-dashboard.firebasestorage.app',
}
