/**
 * Load and validate environment variables with Zod.
 * Exports typed `env` used by server, Firebase config, and services (PORT, Firebase, AI routing, currency, margin).
 * @see docs/CODE_REFERENCE.md
 * References: dotenv, Zod
 */
import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const ROUTING_MODES = ['dynamic', 'openai', 'perplexity'] as const
type RoutingMode = (typeof ROUTING_MODES)[number]

// Coerce string env vars "true"/"false" to boolean for FIREBASE_USE_EMULATOR
const booleanFromEnv = z.preprocess((value) => {
  if (value === 'true') return true
  if (value === 'false') return false
  return value
}, z.boolean())

const EnvSchema = z.object({
  NODE_ENV: z.string().optional().default('development'),
  PORT: z.coerce.number().default(3001),
  FIREBASE_USE_EMULATOR: booleanFromEnv.default(false),
  FIREBASE_PROJECT_ID: z.string().default('luxselle-dashboard'),
  FIREBASE_STORAGE_BUCKET: z
    .string()
    .default('luxselle-dashboard.firebasestorage.app'),
  /** Firestore database ID. Use '(default)' or leave unset for default DB; set to e.g. luxselle-dashboard-95977150 for a secondary (eur3) instance. */
  FIRESTORE_DATABASE_ID: z.string().optional(),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
  FIREBASE_STORAGE_EMULATOR_HOST: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS_JSON: z.string().optional(),
  // Deprecated: single-provider mode. Kept for one release as compatibility shim.
  AI_PROVIDER: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value
      const normalized = value.trim().toLowerCase()
      return normalized.length > 0 ? normalized : undefined
    },
    z.enum(['openai', 'perplexity', 'mock']).optional(),
  ),
  AI_ROUTING_MODE: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value
      const normalized = value.trim().toLowerCase()
      return normalized.length > 0 ? normalized : undefined
    },
    z.enum(ROUTING_MODES).default('dynamic'),
  ),
  OPENAI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  PERPLEXITY_SEARCH_MODEL: z.string().optional().default('sonar'),
  PERPLEXITY_EXTRACTION_MODEL: z.string().optional().default('sonar'),
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
  FRONTEND_ORIGINS: z.string().optional(),
  SEARCH_ENRICHMENT_ENABLED: booleanFromEnv.default(true),
  SEARCH_ENRICHMENT_MAX_COUNT: z.coerce.number().int().positive().default(25),
  SEARCH_ENRICHMENT_CACHE_TTL_MS: z.coerce.number().int().positive().default(300000),
  SEARCH_DOMAIN_ALLOWLIST: z.string().optional(),
  SEARCH_DOMAIN_DENYLIST: z.string().optional(),
  PRICE_CHECK_V2_ENABLED: booleanFromEnv.default(false),
  PRICE_CHECK_BROAD_STRATEGY_ENABLED: booleanFromEnv.default(false),
  PRICE_CHECK_SECONDARY_DOMAINS: z.string().optional(),
})

type ParsedEnv = z.infer<typeof EnvSchema>

function normalizeLegacyAiProvider(value: unknown): ParsedEnv['AI_PROVIDER'] {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase()
  if (normalized === 'openai' || normalized === 'perplexity' || normalized === 'mock') {
    return normalized
  }
  return undefined
}

function resolveRoutingModeFromCompatibility(
  rawRoutingMode: unknown,
  rawLegacyProvider: ParsedEnv['AI_PROVIDER'],
): { routingMode: RoutingMode | string; usedLegacyProvider: boolean } {
  if (typeof rawRoutingMode === 'string' && rawRoutingMode.trim().length > 0) {
    const normalized = rawRoutingMode.trim().toLowerCase()
    if (normalized === 'dynamic' || normalized === 'openai' || normalized === 'perplexity') {
      return {
        routingMode: normalized,
        usedLegacyProvider: false,
      }
    }
    return {
      routingMode: normalized,
      usedLegacyProvider: false,
    }
  }

  if (rawLegacyProvider === 'openai' || rawLegacyProvider === 'perplexity') {
    return {
      routingMode: rawLegacyProvider,
      usedLegacyProvider: true,
    }
  }

  return {
    routingMode: 'dynamic',
    usedLegacyProvider: rawLegacyProvider === 'mock',
  }
}

const rawLegacyProvider = normalizeLegacyAiProvider(process.env.AI_PROVIDER)
const routingResolution = resolveRoutingModeFromCompatibility(
  process.env.AI_ROUTING_MODE,
  rawLegacyProvider,
)

const envInput: Record<string, unknown> = {
  ...process.env,
  AI_ROUTING_MODE: routingResolution.routingMode,
}

if (rawLegacyProvider) {
  envInput.AI_PROVIDER = rawLegacyProvider
}

const parsedEnv = EnvSchema.parse(envInput)

if (routingResolution.usedLegacyProvider && rawLegacyProvider) {
  if (rawLegacyProvider === 'mock') {
    console.warn(
      '[env] AI_PROVIDER=mock is deprecated and ignored; runtime mock mode has been removed. ' +
      'Using AI_ROUTING_MODE=dynamic. AI_PROVIDER compatibility will be removed in the next breaking cleanup.',
    )
  } else {
    console.warn(
      `[env] AI_PROVIDER=${rawLegacyProvider} is deprecated. Mapped to AI_ROUTING_MODE=${routingResolution.routingMode}. ` +
      'Set AI_ROUTING_MODE explicitly. AI_PROVIDER compatibility will be removed in the next breaking cleanup.',
    )
  }
}

// Parse and validate on load; throws if required/env shape is invalid
export const env = parsedEnv
