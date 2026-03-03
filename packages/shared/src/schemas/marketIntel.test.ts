/**
 * Tests for MarketIntelRun schema - specifically the aiUsage field.
 * TDD RED: these tests should fail before the aiUsage field is added to the schema.
 */
import { describe, it, expect } from 'vitest'
import { MarketIntelRunSchema } from './marketIntel'

const baseRun = {
  id: 'run-1',
  organisationId: 'org-1',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  key: 'chanel::classic flap',
  brand: 'Chanel',
  model: 'Classic Flap',
  mode: 'background' as const,
  status: 'succeeded' as const,
}

describe('MarketIntelRunSchema aiUsage field', () => {
  it('validates with aiUsage present', () => {
    const result = MarketIntelRunSchema.safeParse({
      ...baseRun,
      aiUsage: {
        callCount: 3,
        provider: 'openai',
        estimatedCostEur: 0.012,
      },
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.aiUsage).toEqual({
        callCount: 3,
        provider: 'openai',
        estimatedCostEur: 0.012,
      })
    }
  })

  it('validates without aiUsage (field is optional)', () => {
    const result = MarketIntelRunSchema.safeParse(baseRun)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.aiUsage).toBeUndefined()
    }
  })

  it('rejects negative callCount', () => {
    const result = MarketIntelRunSchema.safeParse({
      ...baseRun,
      aiUsage: {
        callCount: -1,
        provider: 'openai',
        estimatedCostEur: 0.012,
      },
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative estimatedCostEur', () => {
    const result = MarketIntelRunSchema.safeParse({
      ...baseRun,
      aiUsage: {
        callCount: 3,
        provider: 'openai',
        estimatedCostEur: -0.001,
      },
    })
    expect(result.success).toBe(false)
  })

  it('MarketIntelRun TypeScript type exposes aiUsage as optional field', () => {
    // This is a type-level test — just verifying the inferred type has the correct shape
    // The TypeScript compiler enforces this; at runtime we validate via Zod
    const run = MarketIntelRunSchema.parse({
      ...baseRun,
      aiUsage: {
        callCount: 3,
        provider: 'perplexity',
        estimatedCostEur: 0.01,
      },
    })
    // aiUsage is optional, so TypeScript type should allow undefined
    const usage: { callCount: number; provider: string; estimatedCostEur: number } | undefined = run.aiUsage
    expect(usage?.callCount).toBe(3)
    expect(usage?.provider).toBe('perplexity')
    expect(usage?.estimatedCostEur).toBe(0.01)
  })
})
