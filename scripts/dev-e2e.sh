#!/usr/bin/env bash
set -euo pipefail

backend_cmd="FIREBASE_USE_EMULATOR=true AI_ROUTING_MODE=dynamic GOOGLE_APPLICATION_CREDENTIALS_JSON='' SUPPLIER_EMAIL_ENABLED=false npm run dev --workspace=@luxselle/server"
client_cmd="VITE_API_BASE='' npm run dev:client"

if lsof -iTCP:8082 -sTCP:LISTEN -n -P >/dev/null 2>&1; then
  echo "[dev:e2e] Reusing process on 8082 (expected Firestore emulator)."
  npx concurrently -k "$backend_cmd" "$client_cmd"
else
  echo "[dev:e2e] No process on 8082; starting Firebase emulators."
  npx concurrently -k "npm run emulators" "$backend_cmd" "$client_cmd"
fi
