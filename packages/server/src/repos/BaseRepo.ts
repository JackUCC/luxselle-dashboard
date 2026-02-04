/**
 * Base Firestore repository: CRUD with optional multi-tenancy (org subcollections or legacy organisationId filter).
 * All entity repos extend this.
 * @see docs/CODE_REFERENCE.md
 * References: firebase-admin/firestore, Zod
 */
import { CollectionReference, DocumentData, Query } from 'firebase-admin/firestore'
import { z } from 'zod'
import { db } from '../config/firebase'
import { DEFAULT_ORG_ID } from '@shared/schemas'

export type WithId<T> = T & { id: string }

/**
 * Base repository supporting multi-tenancy via org subcollections.
 * 
 * Collection structure:
 * - With multi-tenancy: orgs/{orgId}/{collectionName}/{docId}
 * - Legacy (backwards compat): {collectionName}/{docId} with organisationId field
 * 
 * Set useOrgSubcollections=true and pass orgId to methods for multi-tenant mode.
 */
export class BaseRepo<T extends Record<string, unknown>> {
  protected collectionName: string
  protected schema: z.ZodType<T, any, any>
  protected useOrgSubcollections: boolean

  constructor(
    collectionName: string,
    schema: z.ZodType<T, any, any>,
    options?: { useOrgSubcollections?: boolean }
  ) {
    this.collectionName = collectionName
    this.schema = schema
    // Default to false for backwards compatibility
    this.useOrgSubcollections = options?.useOrgSubcollections ?? false
  }

  /**
   * Get collection reference for an org (or root collection in legacy mode)
   */
  protected getCollection(orgId?: string): CollectionReference<DocumentData> {
    if (this.useOrgSubcollections && orgId) {
      return db.collection('orgs').doc(orgId).collection(this.collectionName)
    }
    // Legacy: root-level collection
    return db.collection(this.collectionName)
  }

  /**
   * List all documents, optionally filtered by org
   */
  async list(orgId?: string): Promise<WithId<T>[]> {
    const collection = this.getCollection(orgId)
    let query: Query<DocumentData> = collection
    
    // In legacy mode, filter by organisationId field if provided
    if (!this.useOrgSubcollections && orgId) {
      query = collection.where('organisationId', '==', orgId)
    }
    
    const snapshot = await query.get()
    return snapshot.docs.map((doc) => this.parseDoc(doc.id, doc.data()!))
  }

  async getById(id: string, orgId?: string): Promise<WithId<T> | null> {
    const collection = this.getCollection(orgId)
    const doc = await collection.doc(id).get()
    if (!doc.exists) return null
    return this.parseDoc(doc.id, doc.data()!)
  }

  async create(data: T, orgId?: string): Promise<WithId<T>> {
    const parsed = this.schema.parse(data)
    const collection = this.getCollection(orgId)
    const docRef = await collection.add(parsed)
    return { id: docRef.id, ...parsed }
  }

  async set(id: string, data: Partial<T>, orgId?: string): Promise<WithId<T>> {
    const collection = this.getCollection(orgId)
    await collection.doc(id).set(data, { merge: true })
    const next = await this.getById(id, orgId)
    if (!next) {
      throw new Error(`Document ${id} not found after update`)
    }
    return next
  }

  async remove(id: string, orgId?: string): Promise<void> {
    const collection = this.getCollection(orgId)
    await collection.doc(id).delete()
  }

  protected parseDoc(id: string, data: DocumentData): WithId<T> {
    const parsed = this.schema.parse(data)
    return { id, ...parsed }
  }

  /**
   * Get Firestore instance for transactions
   */
  getFirestore() {
    return db
  }
}
