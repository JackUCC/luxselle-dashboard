/**
 * Pipeline: index product or supplier item images into the embedding store for visual search.
 * Called after product image upload and after supplier item import (when imageUrl is set).
 */
import { DEFAULT_ORG_ID } from '@shared/schemas'
import { ImageEmbeddingRepo } from '../../repos/ImageEmbeddingRepo'
import { embedFromUrl } from './EmbeddingService'

const imageEmbeddingRepo = new ImageEmbeddingRepo()

/** Index a product image for visual search. Call after POST /api/products/:id/images. */
export async function indexProductImage(
  productId: string,
  imageId: string,
  imageUrl: string,
  orgId: string = DEFAULT_ORG_ID
): Promise<void> {
  const embedding = embedFromUrl(imageUrl)
  await imageEmbeddingRepo.create(
    {
      organisationId: orgId,
      productId,
      imageId,
      imageUrl,
      embedding,
      source: 'product',
      createdAt: new Date().toISOString(),
    },
    orgId
  )
}

/** Index a supplier item image for visual search. Call when creating/updating supplier items with imageUrl. */
export async function indexSupplierItemImage(
  supplierItemId: string,
  imageUrl: string,
  orgId: string = DEFAULT_ORG_ID
): Promise<void> {
  if (!imageUrl || !imageUrl.startsWith('http')) return
  await imageEmbeddingRepo.deleteBySupplierItem(orgId, supplierItemId)
  const embedding = embedFromUrl(imageUrl)
  await imageEmbeddingRepo.create(
    {
      organisationId: orgId,
      supplierItemId,
      imageUrl,
      embedding,
      source: 'supplier_item',
      createdAt: new Date().toISOString(),
    },
    orgId
  )
}

/** Remove product image from visual search index. Call when deleting a product image. */
export async function removeProductImageFromIndex(
  productId: string,
  imageId: string,
  orgId: string = DEFAULT_ORG_ID
): Promise<void> {
  await imageEmbeddingRepo.deleteByProductImage(orgId, productId, imageId)
}

export { imageEmbeddingRepo }
