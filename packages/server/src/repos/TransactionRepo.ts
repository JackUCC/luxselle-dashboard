/** Transactions collection; findByProductId for product history. @see docs/CODE_REFERENCE.md */
import { TransactionSchema } from '@shared/schemas'
import type { Transaction } from '@shared/schemas'
import { BaseRepo, type WithId } from './BaseRepo'

export class TransactionRepo extends BaseRepo<Transaction> {
  constructor() {
    super('transactions', TransactionSchema)
  }

  async findByProductId(productId: string, orgId?: string): Promise<WithId<Transaction>[]> {
    const collection = this.getCollection(orgId)
    const snapshot = await collection
      .where('productId', '==', productId)
      .orderBy('occurredAt', 'desc')
      .get()
    return snapshot.docs.map((doc) => this.parseDoc(doc.id, doc.data()!))
  }
}
