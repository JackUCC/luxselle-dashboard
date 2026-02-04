/** Activity event schema. @see docs/CODE_REFERENCE.md */
import { z } from 'zod'
import { BaseDocSchema } from './base'

export const ActivityEventSchema = BaseDocSchema.extend({
  actor: z.string(),
  eventType: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  payload: z.record(z.any()).default({}),
})

export type ActivityEvent = z.infer<typeof ActivityEventSchema>
