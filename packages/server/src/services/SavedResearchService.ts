/** Saved Research service. @see docs/CODE_REFERENCE.md */
import {
  CreateSavedResearchSchema,
  UpdateSavedResearchSchema,
  DEFAULT_ORG_ID,
  type SavedResearch,
  type CreateSavedResearchInput,
  type UpdateSavedResearchInput,
} from '@shared/schemas'
import { SavedResearchRepo } from '../repos/SavedResearchRepo'
import { ApiError, API_ERROR_CODES } from '../lib/errors'
import type { WithId } from '../repos/BaseRepo'

export class SavedResearchService {
  private repo: SavedResearchRepo

  constructor() {
    this.repo = new SavedResearchRepo()
  }

  private normalizeCreateInput(data: unknown): CreateSavedResearchInput {
    if (typeof data !== 'object' || data == null) {
      return CreateSavedResearchSchema.parse(data)
    }

    const payload = data as Record<string, unknown>
    const rawResult =
      typeof payload.result === 'object' && payload.result != null
        ? (payload.result as Record<string, unknown>)
        : undefined

    return CreateSavedResearchSchema.parse({
      ...payload,
      brand: typeof payload.brand === 'string' ? payload.brand : rawResult?.brand,
      model: typeof payload.model === 'string' ? payload.model : rawResult?.model,
      category: typeof payload.category === 'string' ? payload.category : '',
      condition: typeof payload.condition === 'string' ? payload.condition : '',
      starred:
        typeof payload.starred === 'boolean'
          ? payload.starred
          : typeof payload.isStarred === 'boolean'
            ? payload.isStarred
            : undefined,
    })
  }

  private normalizeUpdateInput(data: unknown): UpdateSavedResearchInput {
    if (typeof data !== 'object' || data == null) {
      return UpdateSavedResearchSchema.parse(data)
    }

    const payload = data as Record<string, unknown>
    return UpdateSavedResearchSchema.parse({
      ...payload,
      starred:
        typeof payload.starred === 'boolean'
          ? payload.starred
          : typeof payload.isStarred === 'boolean'
            ? payload.isStarred
            : undefined,
    })
  }

  async save(userId: string, data: unknown): Promise<WithId<SavedResearch>> {
    const parsed = this.normalizeCreateInput(data)
    const now = new Date().toISOString()
    
    const doc: SavedResearch = {
      ...parsed,
      userId,
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
    }

    return this.repo.create(doc)
  }

  async list(userId: string, filters?: { starred?: boolean }): Promise<WithId<SavedResearch>[]> {
    return this.repo.findAll(userId, filters)
  }

  async getById(userId: string, id: string): Promise<WithId<SavedResearch>> {
    const doc = await this.repo.findById(id)
    if (!doc || doc.deletedAt) {
      throw new ApiError(API_ERROR_CODES.NOT_FOUND, 'Saved research not found', undefined, 404)
    }
    if (doc.userId !== userId) {
      throw new ApiError(API_ERROR_CODES.FORBIDDEN, 'Forbidden', undefined, 403)
    }
    return doc
  }

  async toggleStar(userId: string, id: string): Promise<WithId<SavedResearch>> {
    const doc = await this.getById(userId, id)
    const now = new Date().toISOString()
    return this.repo.update(id, { starred: !doc.starred, updatedAt: now })
  }

  async update(userId: string, id: string, data: unknown): Promise<WithId<SavedResearch>> {
    await this.getById(userId, id) // Validate existence and ownership
    
    const parsed = this.normalizeUpdateInput(data)
    const now = new Date().toISOString()
    return this.repo.update(id, { ...parsed, updatedAt: now })
  }

  async delete(userId: string, id: string): Promise<void> {
    await this.getById(userId, id) // Validate existence and ownership
    await this.repo.softDelete(id)
  }
}
