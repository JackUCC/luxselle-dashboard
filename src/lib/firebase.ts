export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'luxselle-dashboard',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'luxselle-dashboard.appspot.com',
}
