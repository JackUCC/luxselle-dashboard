/** Sourcing requests collection. @see docs/CODE_REFERENCE.md */
import { SourcingRequestSchema } from '@shared/schemas'
import type { SourcingRequest } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class SourcingRequestRepo extends BaseRepo<SourcingRequest> {
  constructor() {
    super('sourcing_requests', SourcingRequestSchema)
  }

  async listByStatuses(
    statuses: SourcingRequest['status'][],
    options?: { limit?: number; orgId?: string },
  ) {
    const uniqueStatuses = Array.from(new Set(statuses))
    if (uniqueStatuses.length === 0) return []

    return this.listByQuery({
      orgId: options?.orgId,
      limit: options?.limit,
      whereIn: { field: 'status', values: uniqueStatuses },
    })
  }
}
