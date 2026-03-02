/** System jobs (e.g. import) collection. @see docs/CODE_REFERENCE.md */
import { SystemJobSchema } from '@shared/schemas'
import type { SystemJob } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class SystemJobRepo extends BaseRepo<SystemJob> {
  constructor() {
    super('system_jobs', SystemJobSchema)
  }

  async listRecent(limit: number, orgId?: string) {
    return this.listByQuery({
      orgId,
      limit,
      orderBy: { field: 'createdAt', direction: 'desc' },
    })
  }
}
