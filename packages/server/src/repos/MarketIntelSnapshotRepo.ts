import { MarketIntelSnapshotSchema } from '@shared/schemas'
import type { MarketIntelSnapshot } from '@shared/schemas'
import { BaseRepo, type WithId } from './BaseRepo'

export class MarketIntelSnapshotRepo extends BaseRepo<MarketIntelSnapshot> {
  constructor() {
    super('market_intel_snapshots', MarketIntelSnapshotSchema)
  }

  async findLatestByKey(key: string): Promise<WithId<MarketIntelSnapshot> | null> {
    const collection = this.getCollection()
    const snapshot = await collection.where('key', '==', key).get()
    const docs = snapshot.docs.map((doc) => this.parseDoc(doc.id, doc.data()!))
    docs.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
    return docs[0] ?? null
  }

  async listRecent(limit = 20): Promise<WithId<MarketIntelSnapshot>[]> {
    const list = await this.list()
    return list
      .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
      .slice(0, Math.max(1, limit))
  }

  async upsertByKey(
    key: string,
    payload: Omit<MarketIntelSnapshot, 'organisationId' | 'createdAt' | 'updatedAt' | 'key'> & {
      organisationId: string
      key?: string
      createdAt?: string
      updatedAt?: string
    },
  ): Promise<WithId<MarketIntelSnapshot>> {
    const existing = await this.findLatestByKey(key)
    const now = new Date().toISOString()
    if (!existing) {
      return this.create({
        ...payload,
        key,
        createdAt: now,
        updatedAt: now,
      })
    }
    return this.set(existing.id, {
      ...payload,
      key,
      updatedAt: now,
    })
  }
}
