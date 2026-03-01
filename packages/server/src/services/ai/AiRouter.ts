import { type ZodType } from 'zod'
import { env } from '../../config/env'
import { logger } from '../../middleware/requestId'

export type AiTaskType =
  | 'web_search'
  | 'structured_extraction_json'
  | 'freeform_generation'
  | 'vision_analysis'

export type AiProvider = 'openai' | 'perplexity'
export type AiRoutingMode = 'dynamic' | 'openai' | 'perplexity'

export interface ProviderAvailability {
  openai: boolean
  perplexity: boolean
  vision: boolean
}

export interface AiRouterDiagnostics {
  aiRoutingMode: AiRoutingMode
  providerAvailability: ProviderAvailability
  lastProviderByTask: Partial<Record<AiTaskType, AiProvider>>
}

export interface WebSearchResultPayload {
  rawText: string
  annotations: Array<{ url: string; title: string }>
}

export interface WebSearchOptions {
  query: string
  domains?: string[]
  userLocation?: { country: string }
}

export interface StructuredJsonOptions<T> {
  systemPrompt: string
  userPrompt: string
  schema?: ZodType<T>
  maxTokens?: number
  temperature?: number
}

export interface FreeformGenerationOptions {
  systemPrompt?: string
  userPrompt: string
  maxTokens?: number
  temperature?: number
}

export interface VisionJsonOptions<T> {
  userPrompt: string
  imageBase64: string
  mimeType: string
  schema?: ZodType<T>
  maxTokens?: number
}

export interface RoutedTaskResult<T> {
  data: T
  provider: AiProvider
  fallbackUsed: boolean
}

type AiRouterErrorCode =
  | 'no_provider_available'
  | 'provider_http_error'
  | 'timeout'
  | 'invalid_json'
  | 'invalid_schema'
  | 'network_error'
  | 'empty_response'
  | 'unknown'

interface ProviderHealthState {
  failures: number[]
  unhealthyUntil: number
}

class AiRouterError extends Error {
  code: AiRouterErrorCode
  status?: number

  constructor(code: AiRouterErrorCode, message: string, status?: number) {
    super(message)
    this.name = 'AiRouterError'
    this.code = code
    this.status = status
  }
}

const TASK_TIMEOUT_MS: Record<AiTaskType, number> = {
  web_search: 12_000,
  structured_extraction_json: 10_000,
  freeform_generation: 10_000,
  vision_analysis: 10_000,
}

const RETRYABLE_CODES = new Set<AiRouterErrorCode>([
  'provider_http_error',
  'timeout',
  'invalid_json',
  'invalid_schema',
  'network_error',
])

const PREFERRED_PROVIDERS_BY_TASK: Record<AiTaskType, AiProvider[]> = {
  web_search: ['perplexity', 'openai'],
  structured_extraction_json: ['openai', 'perplexity'],
  freeform_generation: ['openai', 'perplexity'],
  vision_analysis: ['openai'],
}

export class AiRouter {
  private openai: InstanceType<typeof import('openai').default> | null = null
  private openAiKeyInUse: string | null = null
  private readonly providerHealth = new Map<string, ProviderHealthState>()
  private readonly lastProviderByTask = new Map<AiTaskType, AiProvider>()

  private readonly failureWindowMs = 5 * 60_000
  private readonly unhealthyDurationMs = 60_000
  private readonly unhealthyThreshold = 3

  getRoutingMode(): AiRoutingMode {
    if (env.AI_ROUTING_MODE === 'openai' || env.AI_ROUTING_MODE === 'perplexity') {
      return env.AI_ROUTING_MODE
    }
    return 'dynamic'
  }

  getProviderAvailability(): ProviderAvailability {
    return {
      openai: Boolean(env.OPENAI_API_KEY),
      perplexity: Boolean(env.PERPLEXITY_API_KEY),
      vision: Boolean(env.OPENAI_API_KEY),
    }
  }

  getDiagnostics(): AiRouterDiagnostics {
    return {
      aiRoutingMode: this.getRoutingMode(),
      providerAvailability: this.getProviderAvailability(),
      lastProviderByTask: Object.fromEntries(this.lastProviderByTask.entries()),
    }
  }

  async webSearch(opts: WebSearchOptions): Promise<RoutedTaskResult<WebSearchResultPayload>> {
    const response = await this.executeTask<WebSearchResultPayload>({
      task: 'web_search',
      runByProvider: {
        openai: () => this.searchWithOpenAi(opts),
        perplexity: () => this.searchWithPerplexity(opts),
      },
      validateData: (data) => {
        if (typeof data.rawText !== 'string' || !Array.isArray(data.annotations)) {
          throw new AiRouterError('invalid_schema', 'Web search response was malformed')
        }
      },
    })

    return response
  }

  async extractStructuredJson<T>(
    opts: StructuredJsonOptions<T>,
  ): Promise<RoutedTaskResult<T>> {
    return this.executeTask<T>({
      task: 'structured_extraction_json',
      runByProvider: {
        openai: () => this.extractStructuredJsonWithOpenAi(opts),
        perplexity: () => this.extractStructuredJsonWithPerplexity(opts),
      },
      validateData: (data) => {
        if (opts.schema) {
          const parsed = opts.schema.safeParse(data)
          if (!parsed.success) {
            throw new AiRouterError(
              'invalid_schema',
              `Structured extraction schema validation failed: ${parsed.error.issues[0]?.message ?? 'invalid data'}`,
            )
          }
        }
      },
    })
  }

  async generateText(
    opts: FreeformGenerationOptions,
  ): Promise<RoutedTaskResult<string>> {
    const response = await this.executeTask<string>({
      task: 'freeform_generation',
      runByProvider: {
        openai: () => this.generateTextWithOpenAi(opts),
        perplexity: () => this.generateTextWithPerplexity(opts),
      },
      validateData: (data) => {
        if (!data.trim()) {
          throw new AiRouterError('empty_response', 'Generation returned empty content')
        }
      },
    })

    return {
      ...response,
      data: response.data.trim(),
    }
  }

  async analyseVisionJson<T>(
    opts: VisionJsonOptions<T>,
  ): Promise<RoutedTaskResult<T>> {
    return this.executeTask<T>({
      task: 'vision_analysis',
      runByProvider: {
        openai: () => this.analyseVisionWithOpenAi(opts),
      },
      validateData: (data) => {
        if (opts.schema) {
          const parsed = opts.schema.safeParse(data)
          if (!parsed.success) {
            throw new AiRouterError(
              'invalid_schema',
              `Vision extraction schema validation failed: ${parsed.error.issues[0]?.message ?? 'invalid data'}`,
            )
          }
        }
      },
    })
  }

  private async executeTask<T>(opts: {
    task: AiTaskType
    runByProvider: Partial<Record<AiProvider, () => Promise<T>>>
    validateData?: (data: T) => void
  }): Promise<RoutedTaskResult<T>> {
    const orderedProviders = this.resolveOrderedProviders(opts.task, opts.runByProvider)

    if (orderedProviders.length === 0) {
      throw new AiRouterError(
        'no_provider_available',
        `No configured AI provider available for task "${opts.task}"`,
      )
    }

    let lastError: unknown = null
    for (let providerIndex = 0; providerIndex < orderedProviders.length; providerIndex += 1) {
      const provider = orderedProviders[providerIndex]
      const run = opts.runByProvider[provider]
      if (!run) continue

      const fallbackUsed = providerIndex > 0
      const maxAttempts = 2

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const startedAt = Date.now()
        try {
          const data = await this.withTimeout(
            run(),
            TASK_TIMEOUT_MS[opts.task],
            new AiRouterError(
              'timeout',
              `${provider} ${opts.task} timed out`,
              504,
            ),
          )

          if (opts.validateData) {
            opts.validateData(data)
          }

          this.recordSuccess(opts.task, provider)
          this.lastProviderByTask.set(opts.task, provider)

          logger.info('ai_router_task_success', {
            task: opts.task,
            provider,
            attempt,
            fallbackUsed,
            elapsedMs: Date.now() - startedAt,
          })

          return {
            data,
            provider,
            fallbackUsed,
          }
        } catch (error) {
          lastError = error
          const normalized = this.normalizeError(error)
          this.recordFailure(opts.task, provider)

          logger.warn('ai_router_task_failure', {
            task: opts.task,
            provider,
            attempt,
            fallbackUsed,
            code: normalized.code,
            status: normalized.status,
            message: normalized.message,
            elapsedMs: Date.now() - startedAt,
          })

          const shouldRetry =
            attempt < maxAttempts && this.isRetryableError(normalized)
          if (!shouldRetry) {
            break
          }
        }
      }
    }

    throw this.normalizeError(lastError)
  }

  private resolveOrderedProviders<T>(
    task: AiTaskType,
    runByProvider: Partial<Record<AiProvider, () => Promise<T>>>,
  ): AiProvider[] {
    const routingMode = this.getRoutingMode()
    const configured = this.getProviderAvailability()

    const baseOrder = this.resolveBaseProviderOrder(task, routingMode)
    const availableOrder = baseOrder.filter((provider) => {
      if (!runByProvider[provider]) return false
      if (provider === 'openai') return configured.openai
      return configured.perplexity
    })

    if (routingMode !== 'dynamic') {
      return availableOrder
    }

    const healthyProviders: AiProvider[] = []
    const unhealthyProviders: AiProvider[] = []
    for (const provider of availableOrder) {
      if (this.isProviderHealthy(task, provider)) {
        healthyProviders.push(provider)
      } else {
        unhealthyProviders.push(provider)
      }
    }

    if (healthyProviders.length > 0) {
      return [...healthyProviders, ...unhealthyProviders]
    }

    return availableOrder
  }

  private resolveBaseProviderOrder(
    task: AiTaskType,
    routingMode: AiRoutingMode,
  ): AiProvider[] {
    if (task === 'vision_analysis') {
      return ['openai']
    }

    if (routingMode === 'openai') {
      return ['openai']
    }

    if (routingMode === 'perplexity') {
      return ['perplexity']
    }

    return PREFERRED_PROVIDERS_BY_TASK[task]
  }

  private isProviderHealthy(task: AiTaskType, provider: AiProvider): boolean {
    const state = this.providerHealth.get(this.healthKey(task, provider))
    if (!state) return true
    return state.unhealthyUntil <= Date.now()
  }

  private recordFailure(task: AiTaskType, provider: AiProvider): void {
    const key = this.healthKey(task, provider)
    const now = Date.now()
    const existing = this.providerHealth.get(key) ?? { failures: [], unhealthyUntil: 0 }

    const rollingFailures = existing.failures
      .filter((timestamp) => now - timestamp <= this.failureWindowMs)
      .concat(now)

    const unhealthyUntil =
      rollingFailures.length >= this.unhealthyThreshold
        ? now + this.unhealthyDurationMs
        : existing.unhealthyUntil

    this.providerHealth.set(key, {
      failures: rollingFailures,
      unhealthyUntil,
    })
  }

  private recordSuccess(task: AiTaskType, provider: AiProvider): void {
    const key = this.healthKey(task, provider)
    this.providerHealth.set(key, { failures: [], unhealthyUntil: 0 })
  }

  private healthKey(task: AiTaskType, provider: AiProvider): string {
    return `${task}:${provider}`
  }

  private isRetryableError(error: AiRouterError): boolean {
    if (!RETRYABLE_CODES.has(error.code)) {
      return false
    }
    if (!error.status) {
      return true
    }
    return error.status === 429 || error.status >= 500
  }

  private normalizeError(error: unknown): AiRouterError {
    if (error instanceof AiRouterError) {
      return error
    }

    if (error instanceof Error) {
      const status = this.extractHttpStatus(error)
      if (status != null) {
        return new AiRouterError('provider_http_error', error.message, status)
      }
      return new AiRouterError('unknown', error.message)
    }

    return new AiRouterError('unknown', 'Unknown AI provider error')
  }

  private extractHttpStatus(error: Error): number | undefined {
    const candidate = error as Error & { status?: unknown; response?: { status?: unknown } }
    if (typeof candidate.status === 'number') return candidate.status
    if (typeof candidate.response?.status === 'number') return candidate.response.status
    return undefined
  }

  private async getOpenAI() {
    const currentKey = env.OPENAI_API_KEY
    if (!currentKey) {
      throw new AiRouterError('no_provider_available', 'OPENAI_API_KEY is not configured')
    }

    if (!this.openai || this.openAiKeyInUse !== currentKey) {
      const OpenAI = (await import('openai')).default
      this.openai = new OpenAI({ apiKey: currentKey })
      this.openAiKeyInUse = currentKey
    }

    return this.openai
  }

  private async searchWithOpenAi(opts: WebSearchOptions): Promise<WebSearchResultPayload> {
    try {
      const openai = await this.getOpenAI()

      const webSearchTool: {
        type: 'web_search'
        search_context_size: 'high'
        filters?: { allowed_domains: string[] }
        user_location?: { type: 'approximate'; country: string }
      } = {
        type: 'web_search',
        search_context_size: 'high',
      }

      const domains = opts.domains ?? []
      if (domains.length > 0) {
        webSearchTool.filters = { allowed_domains: domains }
      }

      if (opts.userLocation) {
        webSearchTool.user_location = {
          type: 'approximate',
          country: opts.userLocation.country,
        }
      }

      const response = await openai.responses.create({
        model: 'gpt-4o-mini',
        tools: [webSearchTool],
        input: opts.query,
      })

      const rawText = response.output_text ?? ''
      const annotations: Array<{ url: string; title: string }> = []

      for (const item of response.output ?? []) {
        if (item.type !== 'message' || !Array.isArray(item.content)) continue
        for (const block of item.content) {
          if (block.type !== 'output_text' || !Array.isArray(block.annotations)) continue
          for (const ann of block.annotations) {
            if (ann.type === 'url_citation' && ann.url) {
              annotations.push({
                url: ann.url,
                title: ann.title ?? this.extractCitationTitle(ann.url),
              })
            }
          }
        }
      }

      return {
        rawText,
        annotations,
      }
    } catch (error) {
      throw this.normalizeError(error)
    }
  }

  private async searchWithPerplexity(opts: WebSearchOptions): Promise<WebSearchResultPayload> {
    if (!env.PERPLEXITY_API_KEY) {
      throw new AiRouterError('no_provider_available', 'PERPLEXITY_API_KEY is not configured')
    }

    let response: Response
    try {
      response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.PERPLEXITY_SEARCH_MODEL,
          temperature: 0,
          messages: [
            {
              role: 'system',
              content: 'You are a market search assistant. Return concise listing results with sources.',
            },
            { role: 'user', content: opts.query },
          ],
          search_domain_filter: (opts.domains ?? []).length > 0 ? opts.domains : undefined,
          web_search_options: opts.userLocation
            ? { user_location: { country: opts.userLocation.country } }
            : undefined,
        }),
      })
    } catch (error) {
      throw new AiRouterError(
        'network_error',
        `Perplexity search request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    if (!response.ok) {
      throw new AiRouterError(
        'provider_http_error',
        `Perplexity search failed (${response.status})`,
        response.status,
      )
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      citations?: string[]
    }

    const rawText = payload.choices?.[0]?.message?.content ?? ''
    const citations = Array.isArray(payload.citations) ? payload.citations : []
    const annotations = citations
      .filter((url): url is string => typeof url === 'string' && url.length > 0)
      .map((url) => ({ url, title: this.extractCitationTitle(url) }))

    return {
      rawText,
      annotations,
    }
  }

  private async extractStructuredJsonWithOpenAi<T>(
    opts: StructuredJsonOptions<T>,
  ): Promise<T> {
    try {
      const openai = await this.getOpenAI()
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: opts.systemPrompt },
          { role: 'user', content: opts.userPrompt },
        ],
        max_tokens: opts.maxTokens ?? 1500,
        temperature: opts.temperature ?? 0.2,
        response_format: { type: 'json_object' },
      })

      const content = response.choices[0]?.message?.content ?? ''
      return this.parseJsonWithRepair<T>({
        provider: 'openai',
        rawContent: content,
        schema: opts.schema,
      })
    } catch (error) {
      throw this.normalizeError(error)
    }
  }

  private async readErrorBody(response: Response): Promise<string> {
    try {
      const text = await response.text()
      return text.slice(0, 500)
    } catch {
      return ''
    }
  }

  private async extractStructuredJsonWithPerplexity<T>(
    opts: StructuredJsonOptions<T>,
  ): Promise<T> {
    if (!env.PERPLEXITY_API_KEY) {
      throw new AiRouterError('no_provider_available', 'PERPLEXITY_API_KEY is not configured')
    }

    const basePayload = {
      model: env.PERPLEXITY_EXTRACTION_MODEL,
      temperature: opts.temperature ?? 0.2,
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
      max_tokens: opts.maxTokens ?? 1500,
    }

    let response: Response
    try {
      response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...basePayload,
          response_format: { type: 'json_object' },
        }),
      })
    } catch (error) {
      throw new AiRouterError(
        'network_error',
        `Perplexity extraction request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    if (!response.ok && response.status === 400) {
      const firstBody = await this.readErrorBody(response)
      logger.warn('perplexity_extraction_request_compat_retry', {
        model: env.PERPLEXITY_EXTRACTION_MODEL,
        status: response.status,
        body: firstBody,
      })

      try {
        response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(basePayload),
        })
      } catch (error) {
        throw new AiRouterError(
          'network_error',
          `Perplexity extraction retry request failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    if (!response.ok) {
      const body = await this.readErrorBody(response)
      throw new AiRouterError(
        'provider_http_error',
        `Perplexity extraction failed (${response.status}) model=${env.PERPLEXITY_EXTRACTION_MODEL}${body ? ` body=${body}` : ''}`,
        response.status,
      )
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = payload.choices?.[0]?.message?.content ?? ''

    return this.parseJsonWithRepair<T>({
      provider: 'perplexity',
      rawContent: content,
      schema: opts.schema,
    })
  }

  private async generateTextWithOpenAi(opts: FreeformGenerationOptions): Promise<string> {
    try {
      const openai = await this.getOpenAI()
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          ...(opts.systemPrompt
            ? [{ role: 'system' as const, content: opts.systemPrompt }]
            : []),
          { role: 'user' as const, content: opts.userPrompt },
        ],
        max_tokens: opts.maxTokens ?? 400,
        temperature: opts.temperature ?? 0.5,
      })
      return response.choices[0]?.message?.content ?? ''
    } catch (error) {
      throw this.normalizeError(error)
    }
  }

  private async generateTextWithPerplexity(opts: FreeformGenerationOptions): Promise<string> {
    if (!env.PERPLEXITY_API_KEY) {
      throw new AiRouterError('no_provider_available', 'PERPLEXITY_API_KEY is not configured')
    }

    let response: Response
    try {
      response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.PERPLEXITY_EXTRACTION_MODEL,
          temperature: opts.temperature ?? 0.5,
          max_tokens: opts.maxTokens ?? 400,
          messages: [
            ...(opts.systemPrompt
              ? [{ role: 'system', content: opts.systemPrompt }]
              : []),
            { role: 'user', content: opts.userPrompt },
          ],
        }),
      })
    } catch (error) {
      throw new AiRouterError(
        'network_error',
        `Perplexity generation request failed: ${error instanceof Error ? error.message : String(error)}`,
      )
    }

    if (!response.ok) {
      throw new AiRouterError(
        'provider_http_error',
        `Perplexity generation failed (${response.status})`,
        response.status,
      )
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    return payload.choices?.[0]?.message?.content ?? ''
  }

  private async analyseVisionWithOpenAi<T>(opts: VisionJsonOptions<T>): Promise<T> {
    try {
      const openai = await this.getOpenAI()
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: opts.userPrompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${opts.mimeType};base64,${opts.imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: opts.maxTokens ?? 600,
      })

      const content = response.choices[0]?.message?.content ?? ''
      return this.parseJsonWithRepair<T>({
        provider: 'openai',
        rawContent: content,
        schema: opts.schema,
      })
    } catch (error) {
      throw this.normalizeError(error)
    }
  }

  private async parseJsonWithRepair<T>(opts: {
    provider: AiProvider
    rawContent: string
    schema?: ZodType<T>
  }): Promise<T> {
    const initialParse = this.tryParseJson(opts.rawContent)
    const repaired = initialParse.success
      ? initialParse.data
      : await this.tryRepairAndParse(opts.provider, opts.rawContent)

    if (!repaired.success) {
      throw new AiRouterError('invalid_json', repaired.error)
    }

    if (!opts.schema) {
      return repaired.data as T
    }

    const validated = opts.schema.safeParse(repaired.data)
    if (!validated.success) {
      throw new AiRouterError(
        'invalid_schema',
        `JSON failed schema validation: ${validated.error.issues[0]?.message ?? 'invalid shape'}`,
      )
    }
    return validated.data
  }

  private tryParseJson(rawContent: string):
    | { success: true; data: unknown }
    | { success: false; error: string } {
    const candidates: string[] = []
    const trimmed = rawContent.trim()
    if (trimmed) {
      candidates.push(trimmed)
    }
    const match = rawContent.match(/\{[\s\S]*\}/)
    if (match?.[0] && !candidates.includes(match[0])) {
      candidates.push(match[0])
    }

    for (const candidate of candidates) {
      try {
        return { success: true, data: JSON.parse(candidate) }
      } catch {
        // try next candidate
      }
    }

    return {
      success: false,
      error: 'Model returned invalid JSON',
    }
  }

  private async tryRepairAndParse(
    provider: AiProvider,
    rawContent: string,
  ): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
    let repairedContent = ''
    try {
      repairedContent = await this.requestJsonRepair(provider, rawContent)
    } catch (error) {
      return {
        success: false,
        error: `JSON repair failed: ${error instanceof Error ? error.message : String(error)}`,
      }
    }

    const repairedParse = this.tryParseJson(repairedContent)
    if (!repairedParse.success) {
      return {
        success: false,
        error: repairedParse.error,
      }
    }

    return repairedParse
  }

  private async requestJsonRepair(provider: AiProvider, rawContent: string): Promise<string> {
    const prompt = `Repair this malformed JSON. Return ONLY valid JSON and do not invent fields.

Malformed content:
${rawContent}`

    if (provider === 'openai') {
      const openai = await this.getOpenAI()
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You repair malformed JSON. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1600,
        temperature: 0,
        response_format: { type: 'json_object' },
      })

      return response.choices[0]?.message?.content ?? ''
    }

    if (!env.PERPLEXITY_API_KEY) {
      throw new AiRouterError('no_provider_available', 'PERPLEXITY_API_KEY is not configured')
    }

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.PERPLEXITY_EXTRACTION_MODEL,
        temperature: 0,
        max_tokens: 1600,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'You repair malformed JSON. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!response.ok) {
      throw new AiRouterError(
        'provider_http_error',
        `Perplexity JSON repair failed (${response.status})`,
        response.status,
      )
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    return payload.choices?.[0]?.message?.content ?? ''
  }

  private extractCitationTitle(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return url
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutError: AiRouterError,
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined
    try {
      return await Promise.race<T>([
        promise,
        new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => reject(timeoutError), timeoutMs)
        }),
      ])
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }
}

let singletonRouter: AiRouter | null = null

export function getAiRouter(): AiRouter {
  if (!singletonRouter) {
    singletonRouter = new AiRouter()
  }
  return singletonRouter
}
