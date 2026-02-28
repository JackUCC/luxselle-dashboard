import { logger } from '../../middleware/requestId'

export interface ComparableEnrichmentInput {
  sourceUrl: string
}

export interface ComparableEnrichmentResult {
  sourceUrl: string
  previewImageUrl?: string
}

export class ComparableEnrichmentService {
  async enrichComparables(inputs: ComparableEnrichmentInput[]): Promise<ComparableEnrichmentResult[]> {
    const uniqueUrls = [...new Set(inputs.map((input) => input.sourceUrl).filter(Boolean))]

    const results = await Promise.all(
      uniqueUrls.map(async (sourceUrl) => {
        const previewImageUrl = await this.extractPreviewImageUrl(sourceUrl)
        return {
          sourceUrl,
          ...(previewImageUrl ? { previewImageUrl } : {}),
        }
      }),
    )

    return results
  }

  private async extractPreviewImageUrl(sourceUrl: string): Promise<string | undefined> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4000)

    try {
      const response = await fetch(sourceUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'user-agent': 'LuxselleBot/1.0 (+https://luxselle.com)',
          accept: 'text/html,application/xhtml+xml',
        },
      })

      if (!response.ok) return undefined

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('text/html')) return undefined

      const html = await response.text()
      return this.parsePreviewImageFromHtml(html)
    } catch (error) {
      logger.warn('price_check_preview_image_extract_failed', {
        sourceUrl,
        error: error instanceof Error ? error.message : String(error),
      })
      return undefined
    } finally {
      clearTimeout(timeoutId)
    }
  }

  private parsePreviewImageFromHtml(html: string): string | undefined {
    const metaPatterns = [
      /<meta[^>]*property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["'][^>]*>/i,
      /<meta[^>]*name=["']twitter:image(?::src)?["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*name=["']twitter:image(?::src)?["'][^>]*>/i,
    ]

    for (const pattern of metaPatterns) {
      const match = html.match(pattern)
      const candidate = match?.[1]?.trim()
      if (candidate && this.isValidHttpUrl(candidate)) {
        return candidate
      }
    }

    return undefined
  }

  private isValidHttpUrl(value: string): boolean {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }
}
