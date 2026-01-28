import { SupplierSchema } from '@shared/schemas'
import type { Supplier } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class SupplierRepo extends BaseRepo<Supplier> {
  constructor() {
    super('suppliers', SupplierSchema)
  }
}
