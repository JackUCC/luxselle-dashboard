import { z } from 'zod'
import { BaseDocSchema } from './base'

export const SystemJobSchema = BaseDocSchema.extend({
  jobType: z.string(),
  status: z.enum(['success', 'fail', 'running']),
  lastRunAt: z.string().optional(),
  lastSuccessAt: z.string().optional(),
  lastError: z.string().optional().default(''),
})

export type SystemJob = z.infer<typeof SystemJobSchema>
