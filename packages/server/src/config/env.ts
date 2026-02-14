/**
 * Load and validate environment variables with Zod.
 * Exports typed `env` used by server, Firebase config, and services (PORT, Firebase, AI provider, currency, margin).
 * @see docs/CODE_REFERENCE.md
 * References: dotenv, Zod
 */
import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

// Coerce string env vars "true"/"false" to boolean for FIREBASE_USE_EMULATOR
const booleanFromEnv = z.preprocess((value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}, z.boolean())

const EnvSchema = z.object({
  NODE_ENV: z.string().optional().default('development'),
  PORT: z.coerce.number().default(3001),
  FIREBASE_USE_EMULATOR: booleanFromEnv.default(true),
  FIREBASE_PROJECT_ID: z.string().default('luxselle-dashboard'),
  FIREBASE_STORAGE_BUCKET: z
    .string()
    .default('luxselle-dashboard.firebasestorage.app'),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_STORAGE_EMULATOR_HOST: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS_JSON: z.string().optional(),
  AI_PROVIDER: z.enum(['mock', 'openai', 'gemini']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  BASE_CURRENCY: z.string().default('EUR'),
  TARGET_MARGIN_PCT: z.coerce.number().default(35),
  SKIP_AUTH: z.string().optional(), // set to 'true' to disable auth in development
  SUPPLIER_EMAIL_ENABLED: booleanFromEnv.default(false),
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REFRESH_TOKEN: z.string().optional(),
  GMAIL_USER: z.string().optional(),
  SUPPLIER_EMAIL_DEFAULT_QUERY: z.string().default('has:attachment newer_than:30d'),
  SUPPLIER_EMAIL_MAX_ATTACHMENT_MB: z.coerce.number().default(10),
})

// Parse and validate on load; throws if required/env shape is invalid
export const env = EnvSchema.parse(process.env)
