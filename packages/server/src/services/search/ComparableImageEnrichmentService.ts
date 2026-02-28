import { logger } from '../../middleware/requestId'

export interface ComparableWithSourceUrl {
  sourceUrl?: string
  previewImageUrl?: string
}

interface EnrichmentOptions {
  maxUrls?: number
  timeoutMs?: number
}

const DEFAULT_MAX_URLS = 4
const DEFAULT_TIMEOUT_MS = 2500

export class ComparableImageEnrichmentService {
  async enrichComparables<T extends ComparableWithSourceUrl>(
    comparables: T[],
    opts: EnrichmentOptions = {},
  ): Promise<T[]> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const maxUrls = opts.maxUrls ?? DEFAULT_MAX_URLS

    const targets = comparables
      .map((comp, index) => ({ comp, index }))
      .filter(({ comp }) => typeof comp.sourceUrl === 'string' && comp.sourceUrl.trim().length > 0)
      .slice(0, maxUrls)

    await Promise.all(
      targets.map(async ({ comp, index }) => {
        const sourceUrl = comp.sourceUrl?.trim()
        if (!sourceUrl) return

        try {
          const previewImageUrl = await this.extractPreviewImage(sourceUrl, timeoutMs)
          if (previewImageUrl) {
            comparables[index] = { ...comp, previewImageUrl }
            logger.info('comparable_image_enrichment_success', {
              domain: this.getDomain(sourceUrl),
              sourceUrl,
              previewImageUrl,
            })
          } else {
            logger.info('comparable_image_enrichment_no_image', {
              domain: this.getDomain(sourceUrl),
              sourceUrl,
            })
          }
        } catch (error) {
          logger.warn('comparable_image_enrichment_failed', {
            domain: this.getDomain(sourceUrl),
            sourceUrl,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }),
    )

    return comparables
  }

  private async extractPreviewImage(sourceUrl: string, timeoutMs: number): Promise<string | null> {
    const pageUrl = this.safeParseUrl(sourceUrl)
    if (!pageUrl || !this.isHttpUrl(pageUrl)) return null

    const html = await this.fetchText(pageUrl.toString(), timeoutMs)
    if (!html) return null

    const candidates = [
      this.extractMetaContent(html, "meta[property='og:image']"),
      this.extractMetaContent(html, 'meta[name="twitter:image"]'),
      this.extractJsonLdProductImage(html),
    ].flat().filter((candidate): candidate is string => Boolean(candidate))

    for (const candidate of candidates) {
      const normalized = this.normalizeImageUrl(candidate, pageUrl)
      if (!normalized) continue
      if (await this.isSafeImageUrl(normalized, timeoutMs)) {
        return normalized
      }
    }

    return null
  }

  private extractMetaContent(html: string, selector: string): string[] {
    const attrMatch = selector.match(/\[(property|name)=['\"]([^'\"]+)['\"]\]/i)
    if (!attrMatch) return []

    const [, attr, value] = attrMatch
    const tagRegex = new RegExp(`<meta[^>]*${attr}=["']${this.escapeRegex(value)}["'][^>]*>`, 'gi')
    const results: string[] = []

    for (const match of html.matchAll(tagRegex)) {
      const tag = match[0]
      const contentMatch = tag.match(/content=["']([^"']+)["']/i)
      if (contentMatch?.[1]) {
        results.push(contentMatch[1].trim())
      }
    }

    return results
  }

  private extractJsonLdProductImage(html: string): string[] {
    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    const images: string[] = []

    for (const match of html.matchAll(scriptRegex)) {
      const payload = match[1]?.trim()
      if (!payload) continue

      try {
        const parsed = JSON.parse(payload)
        const entries = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed['@graph'])
            ? parsed['@graph']
            : [parsed]

        for (const entry of entries) {
          const type = Array.isArray(entry?.['@type']) ? entry['@type'] : [entry?.['@type']]
          if (!type.some((t: unknown) => String(t).toLowerCase() === 'product')) {
            continue
          }

          const image = entry?.image
          if (typeof image === 'string') {
            images.push(image)
          } else if (Array.isArray(image)) {
            for (const img of image) {
              if (typeof img === 'string') images.push(img)
            }
          }
        }
      } catch {
        continue
      }
    }

    return images
  }

  private normalizeImageUrl(candidate: string, pageUrl: URL): string | null {
    try {
      const normalized = new URL(candidate, pageUrl)
      const secureUrl = this.normalizeSecureImageUrl(normalized)
      if (!secureUrl) return null
      return secureUrl.toString()
    } catch {
      return null
    }
  }

  private async isSafeImageUrl(url: string, timeoutMs: number): Promise<boolean> {
    const parsed = this.safeParseUrl(url)
    if (!parsed) return false

    const secureUrl = this.normalizeSecureImageUrl(parsed)
    if (!secureUrl) return false

    const mime = await this.fetchMimeType(secureUrl.toString(), timeoutMs)
    return typeof mime === 'string' && mime.toLowerCase().startsWith('image/')
  }

  private async fetchMimeType(url: string, timeoutMs: number): Promise<string | null> {
    const headMime = await this.fetchMimeTypeByMethod(url, timeoutMs, 'HEAD')
    if (headMime?.toLowerCase().startsWith('image/')) {
      return headMime
    }

    // Some hosts reject HEAD but still return an image on GET.
    return this.fetchMimeTypeByMethod(url, timeoutMs, 'GET')
  }

  private async fetchMimeTypeByMethod(
    url: string,
    timeoutMs: number,
    method: 'HEAD' | 'GET',
  ): Promise<string | null> {
    try {
      const response = await this.fetchWithTimeout(url, {
        method,
        redirect: 'follow',
        headers: method === 'GET'
          ? {
            range: 'bytes=0-0',
            accept: 'image/*',
          }
          : undefined,
      }, timeoutMs)
      if (!response.ok) return null
      return response.headers.get('content-type')
    } catch {
      return null
    }
  }

  private async fetchText(url: string, timeoutMs: number): Promise<string | null> {
    const response = await this.fetchWithTimeout(url, { redirect: 'follow' }, timeoutMs)
    if (!response.ok) return null

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
    if (!contentType.includes('text/html')) return null

    return response.text()
  }

  private async fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } finally {
      clearTimeout(timeout)
    }
  }

  private safeParseUrl(url: string): URL | null {
    try {
      return new URL(url)
    } catch {
      return null
    }
  }

  private isHttpUrl(url: URL): boolean {
    return url.protocol === 'http:' || url.protocol === 'https:'
  }

  private normalizeSecureImageUrl(url: URL): URL | null {
    if (!this.isHttpUrl(url)) return null

    const secureUrl = new URL(url.toString())
    if (secureUrl.protocol === 'http:') {
      secureUrl.protocol = 'https:'
    }

    return secureUrl.protocol === 'https:' ? secureUrl : null
  }

  private getDomain(url: string): string {
    return this.safeParseUrl(url)?.hostname ?? 'unknown'
  }

  private escapeRegex(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}
