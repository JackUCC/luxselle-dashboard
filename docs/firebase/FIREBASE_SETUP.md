# Firebase Setup Guide

This guide covers everything you need to set up and work with Firebase in the Luxselle Dashboard project.

## Table of Contents
1. [Linking Firebase Correctly](#linking-firebase-correctly)
2. [Adding Firebase SDKs](#adding-firebase-sdks)
3. [Firebase CLI Commands](#firebase-cli-commands)
4. [Firebase Emulators Setup](#firebase-emulators-setup)

---

## Linking Firebase Correctly

### 1. Authenticate with Firebase CLI

First, make sure you're logged into Firebase:

```bash
# Login to Firebase
firebase login

# Verify you're logged in
firebase login:list

# If you need to use a different account
firebase logout
firebase login
```

### 2. Link Your Project

Your project is already linked via `.firebaserc`:

```json
{
  "projects": {
    "default": "luxselle-dashboard"
  }
}
```

To verify or change the project:

```bash
# Check current project
firebase projects:list

# Use a specific project
firebase use luxselle-dashboard

# Or set it explicitly
firebase use --add
```

### 3. Required Configuration Files

✅ **Already configured:**
- `.firebaserc` - Project configuration
- `firebase.json` - Firebase services and emulator config
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Firestore indexes
- `storage.rules` - Storage security rules

### 4. Environment Variables

Make sure your `.env` file has:

```env
# Firebase Project Configuration
FIREBASE_PROJECT_ID=luxselle-dashboard
FIREBASE_STORAGE_BUCKET=luxselle-dashboard.appspot.com

# Emulator Configuration (for local development)
FIREBASE_USE_EMULATOR=true
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199

# Frontend Firebase Config (Vite)
VITE_FIREBASE_PROJECT_ID=luxselle-dashboard
VITE_FIREBASE_STORAGE_BUCKET=luxselle-dashboard.appspot.com

# For Production (when not using emulators)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
```

---

## Adding Firebase SDKs to Your Web Application

### Backend (Server) - ✅ Already Installed

Your server uses **Firebase Admin SDK** (server-side):

```bash
# Already in server/package.json
npm install firebase-admin
```

**Location:** `server/src/config/firebase.ts`

This is used for:
- Server-side Firestore operations
- Server-side Storage operations
- Admin operations (bypasses security rules)

### Frontend (Client) - Optional

Currently, your frontend uses a **backend API approach** (recommended for security). However, if you need direct client-side Firebase access, install:

```bash
# Install Firebase client SDK
npm install firebase
```

Then initialize in `src/lib/firebase.ts`:

```typescript
import { initializeApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage, connectStorageEmulator } from 'firebase/storage'

export const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'luxselle-dashboard',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'luxselle-dashboard.appspot.com',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firestore
export const db = getFirestore(app)

// Initialize Storage
export const storage = getStorage(app)

// Connect to emulators in development
if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    connectStorageEmulator(storage, '127.0.0.1', 9199)
  } catch (error) {
    // Emulators already connected
    console.warn('Firebase emulators already connected')
  }
}

export { app }
```

**Note:** Your current architecture uses a backend API, which is more secure. Only add client SDK if you need:
- Real-time listeners
- Client-side authentication
- Direct client-to-Firebase operations

---

## Firebase CLI Commands

### Project Management

```bash
# List all Firebase projects
firebase projects:list

# Get current project
firebase use

# Switch to a project
firebase use luxselle-dashboard

# Add a project alias
firebase use --add

# Remove a project
firebase use --clear
```

### Emulators

```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only firestore,storage

# Start with UI
firebase emulators:start --only firestore,storage --ui

# Export emulator data
firebase emulators:export ./emulator-data

# Import emulator data
firebase emulators:start --import=./emulator-data

# Clear emulator data
firebase emulators:start --clear
```

### Firestore

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy both rules and indexes
firebase deploy --only firestore

# Open Firestore console
firebase open firestore
```

### Storage

```bash
# Deploy Storage rules
firebase deploy --only storage

# Open Storage console
firebase open storage
```

### General Deployment

```bash
# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only firestore,storage

# Preview deployment
firebase deploy --only firestore:rules --dry-run
```

### Data Management

```bash
# Export Firestore data
firebase firestore:export gs://your-bucket/backup

# Import Firestore data
firebase firestore:import gs://your-bucket/backup
```

### Authentication

```bash
# Login
firebase login

# Login with specific account
firebase login --no-localhost

# List logged-in accounts
firebase login:list

# Logout
firebase logout
```

### Help & Info

```bash
# Get help for any command
firebase help
firebase help deploy
firebase help emulators:start

# Check Firebase CLI version
firebase --version

# Check for updates
firebase update
```

---

## Firebase Emulators Setup

### Current Configuration

Your emulators are configured in `firebase.json`:

```json
{
  "emulators": {
    "firestore": {
      "port": 8080
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

### Starting Emulators

**Option 1: Via npm script (recommended)**
```bash
npm run dev
# This starts: emulators + backend + frontend
```

**Option 2: Emulators only**
```bash
npm run emulators
# Or directly:
firebase emulators:start --only firestore,storage
```

**Option 3: With data persistence**
```bash
# Start with data export directory
firebase emulators:start --only firestore,storage --import=./emulator-data --export-on-exit
```

### Emulator UI

Once emulators are running, access:
- **Emulator UI:** http://localhost:4000
- **Firestore Emulator:** http://localhost:8080
- **Storage Emulator:** http://localhost:9199

### Environment Variables for Emulators

Your `.env` should have:

```env
FIREBASE_USE_EMULATOR=true
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
```

### Emulator Data Management

**Export data:**
```bash
firebase emulators:export ./emulator-data
```

**Import data on start:**
```bash
firebase emulators:start --import=./emulator-data
```

**Auto-export on exit:**
```bash
firebase emulators:start --export-on-exit=./emulator-data
```

**Clear all data:**
```bash
firebase emulators:start --clear
```

### Connecting to Emulators

**Backend (Firebase Admin):**
Already configured in `server/src/config/firebase.ts`:
```typescript
if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080'
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = '127.0.0.1:9199'
}
```

**Frontend (Firebase Client SDK):**
If you add client SDK, connect like this:
```typescript
if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}
```

### Switching Between Emulator and Production

**Use Emulators (Development):**
```env
FIREBASE_USE_EMULATOR=true
```

**Use Real Firebase (Production):**
```env
FIREBASE_USE_EMULATOR=false
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
```

### Troubleshooting Emulators

**Java not found:**
```bash
# Install Java (already done)
brew install openjdk@21
export PATH="/usr/local/opt/openjdk@21/bin:$PATH"
```

**Port already in use:**
```bash
# Check what's using the port
lsof -i :8080
lsof -i :9199
lsof -i :4000

# Kill the process or change ports in firebase.json
```

**Emulators not connecting:**
- Verify `FIREBASE_USE_EMULATOR=true` in `.env`
- Check emulator ports match your config
- Ensure emulators are running before starting your app

---

## Quick Reference

### Daily Development Workflow

```bash
# 1. Start everything (emulators + backend + frontend)
npm run dev

# 2. Access your app
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
# Firebase UI: http://localhost:4000

# 3. Seed data (if needed)
npm run seed
```

### Testing

**Unit tests (Vitest):**
```bash
# Run once
npm run test

# Watch mode
npm run test:watch

# Server-only tests
npm run test --workspace=@luxselle/server
```

**E2E tests (Playwright):**
```bash
# Install Playwright browsers once
npx playwright install

# Run the evaluator workflow smoke tests
npm run test:e2e
```

**Notes:**
- Playwright starts `npm run dev` automatically (emulators + backend + frontend).
- Tests clear Firestore emulator data between runs via the emulator API.
- Ensure ports 5173 (frontend) and 3001 (backend) are free before running.

### Production Deployment

```bash
# 1. Deploy Firestore rules
firebase deploy --only firestore:rules

# 2. Deploy Storage rules
firebase deploy --only storage

# 3. Deploy indexes
firebase deploy --only firestore:indexes
```

### Common Issues

1. **"Project not found"** → Run `firebase use luxselle-dashboard`
2. **"Java not found"** → Install Java: `brew install openjdk@21`
3. **"Port in use"** → Change ports in `firebase.json` or kill existing process
4. **"Emulator not connecting"** → Check `FIREBASE_USE_EMULATOR=true` in `.env`

---

## Next Steps

1. ✅ Verify Firebase login: `firebase login:list`
2. ✅ Verify project: `firebase use`
3. ✅ Test emulators: `npm run emulators`
4. ✅ Access Firebase UI: http://localhost:4000
5. 📝 Review and update security rules in `firestore.rules` and `storage.rules`
6. 📝 Add Firestore indexes as needed in `firestore.indexes.json`
