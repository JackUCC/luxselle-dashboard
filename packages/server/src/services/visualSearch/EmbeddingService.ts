/**
 * Embedding service for visual search. Produces fixed-size vectors from image URL or buffer.
 * Mock implementation: deterministic vector from URL/buffer hash. Replace with FashionCLIP or
 * fashion-image-feature-extractor (e.g. via Python microservice or ONNX) for real similarity.
 */
const EMBEDDING_DIM = 64

function simpleHash(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return h
}

/** Generate deterministic 64-dim vector from a seed string (e.g. image URL). */
export function embedFromSeed(seed: string): number[] {
  const vec: number[] = []
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    const x = simpleHash(`${seed}:${i}`) / 2147483647
    vec.push(x)
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
  return vec.map((v) => v / norm)
}

/** Embed from image URL (mock: uses URL as seed). For real impl, fetch image and run model. */
export function embedFromUrl(imageUrl: string): number[] {
  return embedFromSeed(imageUrl)
}

/** Embed from image buffer (mock: uses buffer length + first bytes as seed). For real impl, run model on buffer. */
export function embedFromBuffer(buffer: Buffer): number[] {
  const seed =
    buffer.length +
    (buffer[0] ?? 0) * 256 +
    (buffer[Math.min(1, buffer.length - 1)] ?? 0) * 256 * 256
  return embedFromSeed(`buffer:${seed}`)
}

export function getEmbeddingDimension(): number {
  return EMBEDDING_DIM
}
