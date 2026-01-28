import { TransactionSchema } from '@shared/schemas'
import type { Transaction } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class TransactionRepo extends BaseRepo<Transaction> {
  constructor() {
    super('transactions', TransactionSchema)
  }
}
