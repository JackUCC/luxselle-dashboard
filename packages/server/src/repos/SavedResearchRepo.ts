/** Saved Research collection. @see docs/CODE_REFERENCE.md */
import { SavedResearchSchema } from '@shared/schemas'
import type { SavedResearch } from '@shared/schemas'
import { BaseRepo, type WithId } from './BaseRepo'

export class SavedResearchRepo extends BaseRepo<SavedResearch> {
  constructor() {
    super('saved_research', SavedResearchSchema)
  }

  async findById(id: string, orgId?: string): Promise<WithId<SavedResearch> | null> {
    return this.getById(id, orgId)
  }

  async findAll(userId: string, filters?: { starred?: boolean }): Promise<WithId<SavedResearch>[]> {
    const collection = this.getCollection()
    // In Firestore, querying optional fields (like deletedAt == null) can be tricky
    // without specific indexes. We query by userId and do filtering/sorting in memory
    // to avoid complex index requirements for this user-scoped data.
    const snapshot = await collection.where('userId', '==', userId).get()
    
    let docs = snapshot.docs.map((doc) => this.parseDoc(doc.id, doc.data()!))
    
    // Filter out soft-deleted items
    docs = docs.filter((doc) => !doc.deletedAt)

    // Apply starred filter if provided
    if (filters?.starred !== undefined) {
      docs = docs.filter((doc) => doc.starred === filters.starred)
    }

    // Sort by createdAt descending
    docs.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return dateB - dateA
    })

    return docs
  }

  async update(id: string, data: Partial<SavedResearch>, orgId?: string): Promise<WithId<SavedResearch>> {
    return this.set(id, data, orgId)
  }

  async softDelete(id: string, orgId?: string): Promise<void> {
    const collection = this.getCollection(orgId)
    await collection.doc(id).set({ deletedAt: new Date().toISOString() }, { merge: true })
  }
}
