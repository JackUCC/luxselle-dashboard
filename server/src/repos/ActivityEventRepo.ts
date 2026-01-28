import { ActivityEventSchema } from '@shared/schemas'
import type { ActivityEvent } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class ActivityEventRepo extends BaseRepo<ActivityEvent> {
  constructor() {
    super('activity_events', ActivityEventSchema)
  }
}
