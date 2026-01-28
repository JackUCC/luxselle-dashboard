import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

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
    .default('luxselle-dashboard.appspot.com'),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_STORAGE_EMULATOR_HOST: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  AI_PROVIDER: z.enum(['mock', 'openai', 'gemini']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  BASE_CURRENCY: z.string().default('EUR'),
  TARGET_MARGIN_PCT: z.coerce.number().default(35),
  // Auth settings - set SKIP_AUTH=true to disable auth in development
  SKIP_AUTH: z.string().optional(),
})

export const env = EnvSchema.parse(process.env)
