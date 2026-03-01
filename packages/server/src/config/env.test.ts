import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_ENV = { ...process.env }

function setEnvValue(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key]
    return
  }
  process.env[key] = value
}

describe('env AI provider compatibility', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...ORIGINAL_ENV }
    delete process.env.AI_ROUTING_MODE
    delete process.env.AI_PROVIDER
  })

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
    vi.restoreAllMocks()
  })

  it('uses explicit AI_ROUTING_MODE when set (AI_PROVIDER does not override)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    setEnvValue('AI_ROUTING_MODE', 'perplexity')
    setEnvValue('AI_PROVIDER', 'openai')

    const { env } = await import('./env')

    expect(env.AI_ROUTING_MODE).toBe('perplexity')
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('maps legacy AI_PROVIDER to routing mode when AI_ROUTING_MODE is unset', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    setEnvValue('AI_PROVIDER', 'openai')

    const { env } = await import('./env')

    expect(env.AI_ROUTING_MODE).toBe('openai')
    expect(env.AI_PROVIDER).toBe('openai')
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain('AI_PROVIDER=openai is deprecated')
  })

  it('ignores legacy AI_PROVIDER=mock and keeps dynamic mode with deprecation warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    setEnvValue('AI_PROVIDER', 'mock')

    const { env } = await import('./env')

    expect(env.AI_ROUTING_MODE).toBe('dynamic')
    expect(env.AI_PROVIDER).toBe('mock')
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy.mock.calls[0]?.[0]).toContain('runtime mock mode has been removed')
  })

  it('throws on invalid explicit AI_ROUTING_MODE even when AI_PROVIDER is set', async () => {
    setEnvValue('AI_ROUTING_MODE', 'invalid')
    setEnvValue('AI_PROVIDER', 'openai')

    await expect(import('./env')).rejects.toThrow(/AI_ROUTING_MODE/i)
  })
})
