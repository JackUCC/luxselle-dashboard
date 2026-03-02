/** Products collection. @see docs/CODE_REFERENCE.md */
import { ProductSchema } from '@shared/schemas'
import type { Product } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class ProductRepo extends BaseRepo<Product> {
  constructor() {
    super('products', ProductSchema)
  }

  async listByStatus(
    status: Product['status'],
    options?: { limit?: number; orgId?: string },
  ) {
    return this.listByQuery({
      orgId: options?.orgId,
      limit: options?.limit,
      whereEquals: [{ field: 'status', value: status }],
    })
  }
}
