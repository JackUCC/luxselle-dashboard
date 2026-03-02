/** Market intelligence snapshot and run schemas for INTEL-02. */
import { z } from 'zod'
import { BaseDocSchema } from './base'
import { MarketResearchResultSchema } from './savedResearch'

export const MarketIntelFreshnessStatusSchema = z.enum(['live', 'fresh', 'stale', 'expired', 'unknown'])
export type MarketIntelFreshnessStatus = z.infer<typeof MarketIntelFreshnessStatusSchema>

export const MarketIntelModeSchema = z.enum(['standard', 'background', 'deep_dive'])
export type MarketIntelMode = z.infer<typeof MarketIntelModeSchema>

export const MarketIntelSnapshotSchema = BaseDocSchema.extend({
  key: z.string(),
  brand: z.string(),
  model: z.string(),
  category: z.string().optional(),
  condition: z.string().optional(),
  generatedAt: z.string(),
  snapshotAgeMinutes: z.number().min(0).default(0),
  freshnessStatus: MarketIntelFreshnessStatusSchema.default('fresh'),
  runId: z.string().optional(),
  mode: MarketIntelModeSchema.optional(),
  cached: z.boolean().default(false),
  result: MarketResearchResultSchema,
})

export type MarketIntelSnapshot = z.infer<typeof MarketIntelSnapshotSchema>

export const MarketIntelRunSchema = BaseDocSchema.extend({
  key: z.string(),
  brand: z.string(),
  model: z.string(),
  category: z.string().optional(),
  condition: z.string().optional(),
  mode: z.enum(['background', 'deep_dive']),
  status: z.enum(['queued', 'running', 'succeeded', 'failed']),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  error: z.string().optional(),
  snapshotId: z.string().optional(),
  result: MarketResearchResultSchema.optional(),
})

export type MarketIntelRun = z.infer<typeof MarketIntelRunSchema>
