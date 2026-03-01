import { describe, expect, it, vi } from 'vitest'

async function buildRouter(overrides: {
  AI_ROUTING_MODE?: 'dynamic' | 'openai' | 'perplexity'
  OPENAI_API_KEY?: string
  PERPLEXITY_API_KEY?: string
}) {
  vi.resetModules()

  const responsesCreate = vi.fn()
  const chatCreate = vi.fn()
  const fetchMock = vi.fn()

  vi.doMock('../../config/env', () => ({
    env: {
      AI_ROUTING_MODE: overrides.AI_ROUTING_MODE ?? 'dynamic',
      OPENAI_API_KEY: overrides.OPENAI_API_KEY,
      PERPLEXITY_API_KEY: overrides.PERPLEXITY_API_KEY,
      PERPLEXITY_SEARCH_MODEL: 'sonar-pro',
      PERPLEXITY_EXTRACTION_MODEL: 'sonar-pro',
    },
  }))

  vi.doMock('openai', () => ({
    default: class OpenAI {
      responses = { create: responsesCreate }
      chat = { completions: { create: chatCreate } }
    },
  }))

  global.fetch = fetchMock as unknown as typeof fetch

  const { AiRouter } = await import('./AiRouter')

  return {
    router: new AiRouter(),
    responsesCreate,
    chatCreate,
    fetchMock,
  }
}

describe('AiRouter provider matrix', () => {
  it('both keys + dynamic: uses perplexity for web search and openai for generation', async () => {
    const { router, fetchMock, chatCreate, responsesCreate } = await buildRouter({
      AI_ROUTING_MODE: 'dynamic',
      OPENAI_API_KEY: 'test-openai-key',
      PERPLEXITY_API_KEY: 'test-perplexity-key',
    })

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'perplexity web result' } }],
        citations: ['https://designerexchange.ie/items/1'],
      }),
    } satisfies Partial<Response>)

    const webSearch = await router.webSearch({ query: 'chanel classic flap' })

    chatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'openai generation result' } }],
    })

    const generation = await router.generateText({ userPrompt: 'summarize market' })

    expect(webSearch.provider).toBe('perplexity')
    expect(generation.provider).toBe('openai')
    expect(webSearch.data.annotations.map((annotation) => annotation.url)).toEqual([
      'https://designerexchange.ie/items/1',
    ])
    expect(responsesCreate).not.toHaveBeenCalled()
  })

  it('perplexity-only: search and generation run via perplexity', async () => {
    const { router, fetchMock, chatCreate } = await buildRouter({
      AI_ROUTING_MODE: 'dynamic',
      OPENAI_API_KEY: undefined,
      PERPLEXITY_API_KEY: 'test-perplexity-key',
    })

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'perplexity web result' } }],
        citations: ['https://siopaella.com/items/1'],
      }),
    } satisfies Partial<Response>)

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'perplexity generation result' } }],
      }),
    } satisfies Partial<Response>)

    const webSearch = await router.webSearch({ query: 'hermes birkin' })
    const generation = await router.generateText({ userPrompt: 'generate text' })

    expect(webSearch.provider).toBe('perplexity')
    expect(generation.provider).toBe('perplexity')
    expect(chatCreate).not.toHaveBeenCalled()
  })

  it('openai-only: search and generation run via openai', async () => {
    const { router, responsesCreate, chatCreate, fetchMock } = await buildRouter({
      AI_ROUTING_MODE: 'dynamic',
      OPENAI_API_KEY: 'test-openai-key',
      PERPLEXITY_API_KEY: undefined,
    })

    responsesCreate.mockResolvedValueOnce({
      output_text: 'openai web result',
      output: [
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              annotations: [{ type: 'url_citation', url: 'https://vestiairecollective.com/items/2' }],
            },
          ],
        },
      ],
    })

    chatCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'openai generation result' } }],
    })

    const webSearch = await router.webSearch({ query: 'dior saddle' })
    const generation = await router.generateText({ userPrompt: 'generate text' })

    expect(webSearch.provider).toBe('openai')
    expect(generation.provider).toBe('openai')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('no keys: throws explicit no-provider-available error', async () => {
    const { router } = await buildRouter({
      AI_ROUTING_MODE: 'dynamic',
      OPENAI_API_KEY: undefined,
      PERPLEXITY_API_KEY: undefined,
    })

    await expect(router.webSearch({ query: 'anything' })).rejects.toThrow(/No configured AI provider available/i)
  })
})
