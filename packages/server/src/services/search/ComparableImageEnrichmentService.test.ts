import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ComparableImageEnrichmentService } from './ComparableImageEnrichmentService'

type MockResponse = {
  ok: boolean
  headers: { get: (name: string) => string | null }
  text: () => Promise<string>
}

function makeResponse(options: { ok?: boolean; contentType?: string; body?: string }): MockResponse {
  const contentType = options.contentType ?? 'text/html'
  const body = options.body ?? ''
  return {
    ok: options.ok ?? true,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? contentType : null,
    },
    text: async () => body,
  }
}

describe('ComparableImageEnrichmentService', () => {
  const service = new ComparableImageEnrichmentService()

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('extracts og:image first and normalizes relative URLs', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => makeResponse({
      body: "<html><meta property='og:image' content='/images/item.jpg'></html>",
    })))

    const comparables = [{ sourceUrl: 'https://example.com/product/123' }]
    const enriched = await service.enrichComparables(comparables)

    expect(enriched[0].previewImageUrl).toBe('https://example.com/images/item.jpg')
  })

  it('falls back to twitter:image and json-ld Product.image', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (!init?.method) {
        return makeResponse({
          body: `
            <html>
              <meta property='og:image' content='/assets/file.txt'>
              <meta name='twitter:image' content='https://cdn.example.com/twitter.webp'>
              <script type='application/ld+json'>
                {"@type":"Product","image":["https://cdn.example.com/jsonld.jpg"]}
              </script>
            </html>
          `,
        })
      }
      return makeResponse({ contentType: 'text/plain' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const comparables = [{ sourceUrl: 'https://example.com/product/123' }]
    const enriched = await service.enrichComparables(comparables)

    expect(enriched[0].previewImageUrl).toBe('https://cdn.example.com/twitter.webp')
  })

  it('swallows per-url failures and continues enriching others', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('bad.example')) {
        throw new Error('network error')
      }
      return makeResponse({
        body: "<html><meta property='og:image' content='https://good.example.com/item.png'></html>",
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const comparables = [
      { sourceUrl: 'https://bad.example/item' },
      { sourceUrl: 'https://ok.example/item' },
    ]
    const enriched = await service.enrichComparables(comparables)

    expect(enriched[0].previewImageUrl).toBeUndefined()
    expect(enriched[1].previewImageUrl).toBe('https://good.example.com/item.png')
  })

  it('limits enrichment attempts to configured maxUrls', async () => {
    const fetchMock = vi.fn(async () =>
      makeResponse({
        body: "<html><meta property='og:image' content='https://cdn.example.com/item.jpg'></html>",
      }))
    vi.stubGlobal('fetch', fetchMock)

    const comparables = Array.from({ length: 5 }, (_, idx) => ({
      sourceUrl: `https://example.com/item-${idx}`,
    }))

    await service.enrichComparables(comparables, { maxUrls: 3 })

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
