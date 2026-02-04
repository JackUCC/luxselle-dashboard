/** Sourcing requests collection. @see docs/CODE_REFERENCE.md */
import { SourcingRequestSchema } from '@shared/schemas'
import type { SourcingRequest } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class SourcingRequestRepo extends BaseRepo<SourcingRequest> {
  constructor() {
    super('sourcing_requests', SourcingRequestSchema)
  }
}
