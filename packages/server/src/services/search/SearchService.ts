/**
 * SearchService: wraps OpenAI Responses API with web_search tool
 * to retrieve live market data from approved luxury resale sources.
 * Falls back to a no-results mock when AI_PROVIDER !== 'openai'.
 */
import { env } from '../../config/env'
import { logger } from '../../middleware/requestId'

export interface SearchResult {
  title: string
  url: string
  snippet: string
}

export interface SearchResponse {
  results: SearchResult[]
  rawText: string
  annotations: Array<{ url: string; title: string }>
}

const APPROVED_DOMAINS = [
  'vestiairecollective.com',
  'designerexchange.ie',
  'luxuryexchange.ie',
  'siopaella.com',
]

export class SearchService {
  private openai: InstanceType<typeof import('openai').default> | null = null

  private async getOpenAI() {
    if (!this.openai) {
      const OpenAI = (await import('openai')).default
      this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
    }
    return this.openai
  }

  /**
   * Perform a web search scoped to approved luxury resale domains.
   * Returns parsed listings (title, url, snippet) plus the raw AI text.
   */
  async searchMarket(
    query: string,
    opts?: { domains?: string[]; userLocation?: { country: string } },
  ): Promise<SearchResponse> {
    if (env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) {
      return { results: [], rawText: '', annotations: [] }
    }

    const domains = opts?.domains ?? APPROVED_DOMAINS

    try {
      const openai = await this.getOpenAI()

      const response = await openai.responses.create({
        model: 'gpt-4o-mini',
        tools: [
          {
            type: 'web_search' as const,
            ...(domains.length > 0
              ? {
                  search_context_size: 'medium' as const,
                }
              : {}),
            ...(opts?.userLocation
              ? {
                  user_location: {
                    type: 'approximate' as const,
                    country: opts.userLocation.country,
                  },
                }
              : {}),
          },
        ],
        input: query,
      })

      const rawText = response.output_text ?? ''

      const annotations: Array<{ url: string; title: string }> = []
      for (const item of response.output ?? []) {
        if (item.type === 'message' && Array.isArray(item.content)) {
          for (const block of item.content) {
            if (block.type === 'output_text' && Array.isArray(block.annotations)) {
              for (const ann of block.annotations) {
                if (ann.type === 'url_citation' && ann.url) {
                  annotations.push({ url: ann.url, title: ann.title ?? '' })
                }
              }
            }
          }
        }
      }

      const results = annotations.map((ann) => ({
        title: ann.title,
        url: ann.url,
        snippet: '',
      }))

      return { results, rawText, annotations }
    } catch (error) {
      logger.error('search_service_error', error)
      return { results: [], rawText: '', annotations: [] }
    }
  }

  /**
   * General-purpose web search (no domain restriction).
   * Used for retail price lookups, serial code research, etc.
   */
  async searchWeb(query: string): Promise<SearchResponse> {
    if (env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) {
      return { results: [], rawText: '', annotations: [] }
    }

    try {
      const openai = await this.getOpenAI()

      const response = await openai.responses.create({
        model: 'gpt-4o-mini',
        tools: [{ type: 'web_search' as const, search_context_size: 'medium' as const }],
        input: query,
      })

      const rawText = response.output_text ?? ''

      const annotations: Array<{ url: string; title: string }> = []
      for (const item of response.output ?? []) {
        if (item.type === 'message' && Array.isArray(item.content)) {
          for (const block of item.content) {
            if (block.type === 'output_text' && Array.isArray(block.annotations)) {
              for (const ann of block.annotations) {
                if (ann.type === 'url_citation' && ann.url) {
                  annotations.push({ url: ann.url, title: ann.title ?? '' })
                }
              }
            }
          }
        }
      }

      const results = annotations.map((ann) => ({
        title: ann.title,
        url: ann.url,
        snippet: '',
      }))

      return { results, rawText, annotations }
    } catch (error) {
      logger.error('search_web_error', error)
      return { results: [], rawText: '', annotations: [] }
    }
  }

  /**
   * Search + synthesize: performs web search then asks a second model call
   * to extract structured JSON from the search results.
   * This is the core RAG pattern: Retrieve (web_search) then Generate (structured extraction).
   */
  async searchAndExtract<T>(opts: {
    searchQuery: string
    extractionPrompt: string
    domains?: string[]
  }): Promise<{ extracted: T | null; searchResponse: SearchResponse }> {
    const searchResponse = await this.searchMarket(opts.searchQuery, {
      domains: opts.domains,
    })

    if (!searchResponse.rawText && searchResponse.results.length === 0) {
      return { extracted: null, searchResponse }
    }

    if (env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) {
      return { extracted: null, searchResponse }
    }

    try {
      const openai = await this.getOpenAI()
      const contextBlock = searchResponse.rawText
        ? `Web search results:\n"""\n${searchResponse.rawText}\n"""\n\nSource URLs found:\n${searchResponse.annotations.map((a) => `- ${a.title}: ${a.url}`).join('\n')}`
        : 'No web results found.'

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You extract structured data from web search results. Return ONLY valid JSON, no markdown.',
          },
          {
            role: 'user',
            content: `${contextBlock}\n\n${opts.extractionPrompt}`,
          },
        ],
        max_tokens: 1500,
        temperature: 0.2,
      })

      const text = response.choices[0]?.message?.content ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) return { extracted: null, searchResponse }

      const parsed = JSON.parse(jsonMatch[0]) as T
      return { extracted: parsed, searchResponse }
    } catch (error) {
      logger.error('search_extract_error', error)
      return { extracted: null, searchResponse }
    }
  }
}
