# Firebase

Firebase project config and rules. Run emulators from repo root: `npm run emulators` (uses `--config firebase/firebase.json`).

| File | Purpose |
|------|---------|
| **firebase.json** | Firestore + Storage rules paths, emulator ports. |
| **firestore.rules** | Firestore security rules. |
| **firestore.indexes.json** | Firestore indexes. |
| **storage.rules** | Storage security rules. |

Project alias (e.g. default project) is in root `.firebaserc` so the Firebase CLI can resolve it when run from root.
