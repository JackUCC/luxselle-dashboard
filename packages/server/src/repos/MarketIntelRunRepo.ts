import { MarketIntelRunSchema } from '@shared/schemas'
import type { MarketIntelRun } from '@shared/schemas'
import { BaseRepo, type WithId } from './BaseRepo'

export class MarketIntelRunRepo extends BaseRepo<MarketIntelRun> {
  constructor() {
    super('market_intel_runs', MarketIntelRunSchema)
  }

  async listRecent(limit = 20): Promise<WithId<MarketIntelRun>[]> {
    const list = await this.list()
    return list
      .sort((a, b) => (b.startedAt ?? b.createdAt).localeCompare(a.startedAt ?? a.createdAt))
      .slice(0, Math.max(1, limit))
  }

  async listByKey(key: string, limit = 20): Promise<WithId<MarketIntelRun>[]> {
    const collection = this.getCollection()
    const snapshot = await collection.where('key', '==', key).get()
    const docs = snapshot.docs.map((doc) => this.parseDoc(doc.id, doc.data()!))
    docs.sort((a, b) => (b.startedAt ?? b.createdAt).localeCompare(a.startedAt ?? a.createdAt))
    return docs.slice(0, Math.max(1, limit))
  }
}
