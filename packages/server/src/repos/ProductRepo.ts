/** Products collection. @see docs/CODE_REFERENCE.md */
import { ProductSchema } from '@shared/schemas'
import type { Product } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class ProductRepo extends BaseRepo<Product> {
  constructor() {
    super('products', ProductSchema)
  }
}
