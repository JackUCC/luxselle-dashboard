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
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      if (method === 'GET' && url === 'https://example.com/product/123') {
        return makeResponse({
          body: "<html><meta property='og:image' content='/images/item.jpg'></html>",
        })
      }
      if (method === 'HEAD' && url === 'https://example.com/images/item.jpg') {
        return makeResponse({ contentType: 'image/jpeg' })
      }
      return makeResponse({ ok: false })
    })
    vi.stubGlobal('fetch', fetchMock)

    const comparables = [{ sourceUrl: 'https://example.com/product/123' }]
    const enriched = await service.enrichComparables(comparables)

    expect(enriched[0].previewImageUrl).toBe('https://example.com/images/item.jpg')
  })

  it('upgrades http:// image candidates to https:// when validating preview URLs', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      if (method === 'GET' && url === 'https://example.com/product/123') {
        return makeResponse({
          body: "<html><meta property='og:image' content='http://cdn.example.com/item.jpg'></html>",
        })
      }
      if (method === 'HEAD' && url === 'https://cdn.example.com/item.jpg') {
        return makeResponse({ contentType: 'image/jpeg' })
      }
      return makeResponse({ ok: false })
    })
    vi.stubGlobal('fetch', fetchMock)

    const comparables = [{ sourceUrl: 'https://example.com/product/123' }]
    const enriched = await service.enrichComparables(comparables)

    expect(enriched[0].previewImageUrl).toBe('https://cdn.example.com/item.jpg')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://cdn.example.com/item.jpg',
      expect.objectContaining({ method: 'HEAD' }),
    )
  })

  it('drops broken or invalid preview URLs', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      if (method === 'GET' && url === 'https://example.com/product/123') {
        return makeResponse({
          body: "<html><meta property='og:image' content='http://cdn.example.com/broken.jpg'></html>",
        })
      }
      if (method === 'HEAD' && url === 'https://cdn.example.com/broken.jpg') {
        return makeResponse({ ok: false })
      }
      if (method === 'GET' && url === 'https://cdn.example.com/broken.jpg') {
        return makeResponse({ ok: false })
      }
      return makeResponse({ ok: false })
    })
    vi.stubGlobal('fetch', fetchMock)

    const comparables = [{ sourceUrl: 'https://example.com/product/123' }]
    const enriched = await service.enrichComparables(comparables)

    expect(enriched[0].previewImageUrl).toBeUndefined()
  })

  it('falls back to twitter:image and json-ld Product.image extraction', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      if (method === 'GET' && url === 'https://example.com/product/123') {
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
      if (method === 'HEAD' && url === 'https://example.com/assets/file.txt') {
        return makeResponse({ ok: false })
      }
      if (method === 'GET' && url === 'https://example.com/assets/file.txt') {
        return makeResponse({ ok: false })
      }
      if (method === 'HEAD' && url === 'https://cdn.example.com/twitter.webp') {
        return makeResponse({ contentType: 'image/webp' })
      }
      return makeResponse({ ok: false })
    })
    vi.stubGlobal('fetch', fetchMock)

    const comparables = [{ sourceUrl: 'https://example.com/product/123' }]
    const enriched = await service.enrichComparables(comparables)

    expect(enriched[0].previewImageUrl).toBe('https://cdn.example.com/twitter.webp')
  })

  it('swallows per-url failures and continues enriching others', async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      if (url.includes('bad.example')) {
        throw new Error('network error')
      }
      if (method === 'GET' && url === 'https://ok.example/item') {
        return makeResponse({
          body: "<html><meta property='og:image' content='https://good.example.com/item.png'></html>",
        })
      }
      if (method === 'HEAD' && url === 'https://good.example.com/item.png') {
        return makeResponse({ contentType: 'image/png' })
      }
      return makeResponse({ ok: false })
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
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      if (method === 'GET' && url.startsWith('https://example.com/item-')) {
        return makeResponse({
          body: "<html><meta property='og:image' content='https://cdn.example.com/item.jpg'></html>",
        })
      }
      if (method === 'HEAD' && url === 'https://cdn.example.com/item.jpg') {
        return makeResponse({ contentType: 'image/jpeg' })
      }
      return makeResponse({ ok: false })
    })
    vi.stubGlobal('fetch', fetchMock)

    const comparables = Array.from({ length: 5 }, (_, idx) => ({
      sourceUrl: `https://example.com/item-${idx}`,
    }))

    await service.enrichComparables(comparables, { maxUrls: 3 })

    const pageFetches = fetchMock.mock.calls.filter(([, init]) => !init?.method)
    expect(pageFetches).toHaveLength(3)
  })
})
