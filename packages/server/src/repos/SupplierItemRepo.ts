/** Supplier items collection. @see docs/CODE_REFERENCE.md */
import { SupplierItemSchema } from '@shared/schemas'
import type { SupplierItem } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class SupplierItemRepo extends BaseRepo<SupplierItem> {
  constructor() {
    super('supplier_items', SupplierItemSchema)
  }
}
