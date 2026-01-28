import { CollectionReference, DocumentData } from 'firebase-admin/firestore'
import { z } from 'zod'
import { db } from '../config/firebase'

export type WithId<T> = T & { id: string }

export class BaseRepo<T extends Record<string, unknown>> {
  protected collection: CollectionReference<DocumentData>
  protected schema: z.ZodType<T, any, any>

  constructor(collectionName: string, schema: z.ZodType<T, any, any>) {
    this.collection = db.collection(collectionName)
    this.schema = schema
  }

  async list(): Promise<WithId<T>[]> {
    const snapshot = await this.collection.get()
    return snapshot.docs.map((doc) => this.parseDoc(doc.id, doc.data()!))
  }

  async getById(id: string): Promise<WithId<T> | null> {
    const doc = await this.collection.doc(id).get()
    if (!doc.exists) return null
    return this.parseDoc(doc.id, doc.data()!)
  }

  async create(data: T): Promise<WithId<T>> {
    const parsed = this.schema.parse(data)
    const docRef = await this.collection.add(parsed)
    return { id: docRef.id, ...parsed }
  }

  async set(id: string, data: Partial<T>): Promise<WithId<T>> {
    // Use passthrough to allow partial updates without strict validation
    await this.collection.doc(id).set(data, { merge: true })
    const next = await this.getById(id)
    if (!next) {
      throw new Error(`Document ${id} not found after update`)
    }
    return next
  }

  async remove(id: string): Promise<void> {
    await this.collection.doc(id).delete()
  }

  protected parseDoc(id: string, data: DocumentData): WithId<T> {
    const parsed = this.schema.parse(data)
    return { id, ...parsed }
  }
}
