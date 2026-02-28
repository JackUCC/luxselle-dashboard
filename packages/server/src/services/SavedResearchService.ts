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

  private toOptionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined
  }

  private toOptionalNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined
  }

  private toComparableDataOrigin(value: unknown): 'web_search' | 'ai_estimate' | undefined {
    return value === 'web_search' || value === 'ai_estimate' ? value : undefined
  }

  private normalizeComparablePayload(value: unknown): unknown {
    if (typeof value !== 'object' || value == null) {
      return value
    }

    const comparable = value as Record<string, unknown>
    return {
      ...comparable,
      sourceUrl: this.toOptionalString(comparable.sourceUrl),
      previewImageUrl: this.toOptionalString(comparable.previewImageUrl),
      daysListed: this.toOptionalNumber(comparable.daysListed),
      dataOrigin: this.toComparableDataOrigin(comparable.dataOrigin),
    }
  }

  private normalizeResultPayload(value: unknown): unknown {
    if (typeof value !== 'object' || value == null) {
      return value
    }

    const result = value as Record<string, unknown>
    const comparables = Array.isArray(result.comparables)
      ? result.comparables.map((comparable) => this.normalizeComparablePayload(comparable))
      : result.comparables

    return {
      ...result,
      comparables,
      trendingScore: this.toOptionalNumber(result.trendingScore),
      seasonalNotes: this.toOptionalString(result.seasonalNotes),
    }
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
    const normalizedResult = this.normalizeResultPayload(payload.result)

    return CreateSavedResearchSchema.parse({
      ...payload,
      brand: typeof payload.brand === 'string' ? payload.brand : rawResult?.brand,
      model: typeof payload.model === 'string' ? payload.model : rawResult?.model,
      category: typeof payload.category === 'string' ? payload.category : '',
      condition: typeof payload.condition === 'string' ? payload.condition : '',
      result: normalizedResult,
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
