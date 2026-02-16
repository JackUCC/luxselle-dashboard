import { env, integrationReadiness } from '../src/config/env'

function fail(message: string): never {
  throw new Error(`[verify-live-config] ${message}`)
}

async function run() {
  const issues: string[] = []

  if (env.AI_PROVIDER === 'mock') {
    issues.push('AI_PROVIDER is mock. Set AI_PROVIDER=openai or AI_PROVIDER=gemini.')
  }

  if (!integrationReadiness.ai.configured) {
    issues.push('AI provider credentials are missing or incomplete.')
  }

  if (!integrationReadiness.firebase.credentialsConfigured) {
    issues.push('Firebase credentials are missing for non-emulator mode.')
  }

  if (env.SUPPLIER_EMAIL_ENABLED && !integrationReadiness.supplierEmail.credentialsConfigured) {
    issues.push('Supplier email sync is enabled but Gmail OAuth credentials are incomplete.')
  }

  if (issues.length) {
    issues.forEach((issue) => console.error(`- ${issue}`))
    fail('Live configuration checks failed.')
  }

  console.log('Live configuration checks passed.', {
    nodeEnv: env.NODE_ENV,
    aiProvider: env.AI_PROVIDER,
    firebaseEmulator: env.FIREBASE_USE_EMULATOR,
    supplierEmailEnabled: env.SUPPLIER_EMAIL_ENABLED,
  })
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
