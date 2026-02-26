/**
 * Visual search: embed query image and find top-K similar indexed images.
 */
import { DEFAULT_ORG_ID } from '@shared/schemas'
import type { VisualSearchResult } from '@shared/schemas'
import { imageEmbeddingRepo } from './VisualSearchPipeline'
import { embedFromBuffer, embedFromUrl } from './EmbeddingService'
import { ProductRepo } from '../../repos/ProductRepo'
import { SupplierItemRepo } from '../../repos/SupplierItemRepo'

const productRepo = new ProductRepo()
const supplierItemRepo = new SupplierItemRepo()

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return Math.max(0, Math.min(1, dot))
}

export async function searchByImageBuffer(
  buffer: Buffer,
  orgId: string = DEFAULT_ORG_ID,
  topK: number = 20
): Promise<VisualSearchResult[]> {
  const queryEmbedding = embedFromBuffer(buffer)
  const docs = await imageEmbeddingRepo.listForOrg(orgId)
  const withScore = docs.map((doc) => ({
    doc,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
  }))
  withScore.sort((a, b) => b.score - a.score)
  const top = withScore.slice(0, topK).filter((x) => x.score > 0)
  return enrichResults(top.map((x) => ({ ...x.doc, score: x.score })))
}

export async function searchByImageUrl(
  imageUrl: string,
  orgId: string = DEFAULT_ORG_ID,
  topK: number = 20
): Promise<VisualSearchResult[]> {
  const queryEmbedding = embedFromUrl(imageUrl)
  const docs = await imageEmbeddingRepo.listForOrg(orgId)
  const withScore = docs.map((doc) => ({
    doc,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
  }))
  withScore.sort((a, b) => b.score - a.score)
  const top = withScore.slice(0, topK).filter((x) => x.score > 0)
  return enrichResults(top.map((x) => ({ ...x.doc, score: x.score })))
}

async function enrichResults(
  hits: Array<{
    productId?: string
    supplierItemId?: string
    imageUrl: string
    score: number
  }>
): Promise<VisualSearchResult[]> {
  const results: VisualSearchResult[] = []
  for (const hit of hits) {
    let title: string | undefined
    if (hit.productId) {
      const product = await productRepo.getById(hit.productId)
      title = product ? `${product.brand} ${product.model}`.trim() : undefined
    } else if (hit.supplierItemId) {
      const item = await supplierItemRepo.getById(hit.supplierItemId)
      title = item?.title
    }
    results.push({
      productId: hit.productId,
      supplierItemId: hit.supplierItemId,
      imageUrl: hit.imageUrl,
      title,
      score: hit.score,
    })
  }
  return results
}
