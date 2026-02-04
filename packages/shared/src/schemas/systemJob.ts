/** System job schema (e.g. import). @see docs/CODE_REFERENCE.md */
import { z } from 'zod'
import { BaseDocSchema } from './base'

// Job error entry
export const JobErrorSchema = z.object({
  index: z.number().optional(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
})

// Job progress tracking
export const JobProgressSchema = z.object({
  total: z.number(),
  processed: z.number(),
  created: z.number().default(0),
  updated: z.number().default(0),
  skipped: z.number().default(0),
  errors: z.array(JobErrorSchema).default([]),
})

export type JobProgress = z.infer<typeof JobProgressSchema>
export type JobError = z.infer<typeof JobErrorSchema>

export const SystemJobSchema = BaseDocSchema.extend({
  jobType: z.string(), // e.g., 'supplier_import', 'pricing_analysis'
  // Enhanced status lifecycle: queued -> running -> succeeded | failed
  status: z.enum(['queued', 'running', 'succeeded', 'failed', 'success', 'fail']),
  // Timing
  queuedAt: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
  // Legacy fields (for backwards compat)
  lastRunAt: z.string().optional(),
  lastSuccessAt: z.string().optional(),
  lastError: z.string().optional().default(''),
  // Progress tracking
  progress: JobProgressSchema.optional(),
  // Retry info
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),
  // Input metadata
  input: z.record(z.unknown()).optional(), // e.g., { supplierId, fileName }
  // Output/result
  output: z.record(z.unknown()).optional(),
})

export type SystemJob = z.infer<typeof SystemJobSchema>
