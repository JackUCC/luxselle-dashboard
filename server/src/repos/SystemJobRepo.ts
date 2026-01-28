import { SystemJobSchema } from '@shared/schemas'
import type { SystemJob } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class SystemJobRepo extends BaseRepo<SystemJob> {
  constructor() {
    super('system_jobs', SystemJobSchema)
  }
}
