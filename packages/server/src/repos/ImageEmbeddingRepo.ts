/** Image embeddings collection for visual similarity search. One doc per product image or supplier item image. */
import { DEFAULT_ORG_ID } from '@shared/schemas'
import { ImageEmbeddingSchema, type ImageEmbedding } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class ImageEmbeddingRepo extends BaseRepo<ImageEmbedding> {
  constructor() {
    super('image_embeddings', ImageEmbeddingSchema)
  }

  /** List all embeddings for an org (for search). */
  async listForOrg(orgId: string = DEFAULT_ORG_ID): Promise<(ImageEmbedding & { id: string })[]> {
    return this.list(orgId)
  }

  /** Delete embedding(s) for a product image. */
  async deleteByProductImage(orgId: string, productId: string, imageId: string): Promise<void> {
    const all = await this.list(orgId)
    const toDelete = all.filter(
      (d) => d.productId === productId && d.imageId === imageId
    )
    for (const doc of toDelete) {
      await this.remove(doc.id, orgId)
    }
  }

  /** Delete embedding(s) for a supplier item. */
  async deleteBySupplierItem(orgId: string, supplierItemId: string): Promise<void> {
    const all = await this.list(orgId)
    const toDelete = all.filter((d) => d.supplierItemId === supplierItemId)
    for (const doc of toDelete) {
      await this.remove(doc.id, orgId)
    }
  }
}
