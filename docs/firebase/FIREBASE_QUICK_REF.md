# Firebase Quick Reference

## ✅ Current Status
- **Logged in as:** jackkellehercork@gmail.com
- **Active project:** luxselle-dashboard
- **Emulators:** Configured and running

## 🚀 Most Common Commands

```bash
# Start everything (emulators + backend + frontend)
npm run dev

# Start emulators only
npm run emulators

# Check Firebase login
firebase login:list

# Check current project
firebase use

# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Storage rules
firebase deploy --only storage
```

## 🔗 Important URLs (when running)

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Firebase Emulator UI:** http://localhost:4000
- **Firestore Emulator:** http://localhost:8080
- **Storage Emulator:** http://localhost:9199

## 📋 What You Need to Link Firebase Correctly

1. ✅ **Firebase CLI installed** - `firebase-tools` in package.json
2. ✅ **Authenticated** - You're logged in as jackkellehercork@gmail.com
3. ✅ **Project linked** - `.firebaserc` configured with `luxselle-dashboard`
4. ✅ **Configuration files** - `firebase.json`, rules, indexes all present
5. ✅ **Environment variables** - `.env` configured

## 📦 Firebase SDKs Status

### Backend (Server)
- ✅ **Firebase Admin SDK** installed (`firebase-admin`)
- ✅ Configured in `server/src/config/firebase.ts`
- ✅ Connected to emulators automatically

### Frontend (Client)
- ⚠️ **Firebase Client SDK** NOT installed (using backend API approach)
- ✅ Config exists in `src/lib/firebase.ts` (but not initialized)
- 💡 **Recommendation:** Keep using backend API for security

## 🎯 Main Firebase CLI Commands

### Project Management
```bash
firebase projects:list          # List all projects
firebase use <project-id>       # Switch project
firebase use                    # Show current project
```

### Emulators
```bash
firebase emulators:start                    # Start all emulators
firebase emulators:start --only firestore,storage  # Start specific
firebase emulators:export ./data           # Export data
firebase emulators:start --import=./data   # Import data
```

### Deployment
```bash
firebase deploy                            # Deploy everything
firebase deploy --only firestore:rules     # Deploy Firestore rules
firebase deploy --only storage             # Deploy Storage rules
firebase deploy --only firestore:indexes   # Deploy indexes
```

### Authentication
```bash
firebase login                             # Login
firebase login:list                        # List accounts
firebase logout                           # Logout
```

## 🔧 Emulator Setup

Your emulators are configured in `firebase.json`:
- **Firestore:** Port 8080
- **Storage:** Port 9199
- **UI:** Port 4000

**Environment variables** (in `.env`):
```env
FIREBASE_USE_EMULATOR=true
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
```

## 📚 Full Documentation

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) in this folder for the complete guide.
