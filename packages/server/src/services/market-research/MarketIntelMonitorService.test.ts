/**
 * Unit tests for MarketIntelMonitorService.
 * TDD RED: these tests will fail until aiUsage is captured in executeRun().
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getFreshnessStatus } from './MarketIntelMonitorService'

const {
  mockAnalyse,
  mockRunCreate,
  mockRunSet,
  mockSnapshotUpsertByKey,
  mockSnapshotListRecent,
} = vi.hoisted(() => ({
  mockAnalyse: vi.fn(),
  mockRunCreate: vi.fn(),
  mockRunSet: vi.fn(),
  mockSnapshotUpsertByKey: vi.fn(),
  mockSnapshotListRecent: vi.fn(),
}))

vi.mock('./MarketResearchService', () => ({
  MarketResearchService: class {
    analyse = mockAnalyse
  },
}))

vi.mock('../../repos/MarketIntelRunRepo', () => ({
  MarketIntelRunRepo: class {
    create = mockRunCreate
    set = mockRunSet
  },
}))

vi.mock('../../repos/MarketIntelSnapshotRepo', () => ({
  MarketIntelSnapshotRepo: class {
    upsertByKey = mockSnapshotUpsertByKey
    listRecent = mockSnapshotListRecent
    findLatestByKey = vi.fn().mockResolvedValue(null)
  },
}))

const mockAnalyseResult = {
  provider: 'openai',
  providerStatus: 'available' as const,
  brand: 'Chanel',
  model: 'Classic Flap',
  estimatedMarketValueEur: 4500,
  priceRangeLowEur: 4000,
  priceRangeHighEur: 5000,
  suggestedBuyPriceEur: 3200,
  suggestedSellPriceEur: 4500,
  demandLevel: 'high' as const,
  priceTrend: 'stable' as const,
  marketLiquidity: 'moderate' as const,
  recommendation: 'buy' as const,
  confidence: 0.8,
  marketSummary: 'Strong market',
  keyInsights: [],
  riskFactors: [],
  comparables: [],
  trendSignal: 'flat' as const,
  intel: {
    mode: 'standard' as const,
    generatedAt: new Date().toISOString(),
    snapshotAgeMinutes: 0,
    freshnessStatus: 'live' as const,
    cached: false,
  },
}

describe('getFreshnessStatus', () => {
  it('returns live for age <= LIVE_MAX', () => {
    // LIVE_MAX_AGE_MINUTES defaults to 5 in env config
    expect(getFreshnessStatus(0)).toBe('live')
    expect(getFreshnessStatus(1)).toBe('live')
  })

  it('returns expired for very old age', () => {
    expect(getFreshnessStatus(999999)).toBe('expired')
  })

  it('returns unknown for non-finite age', () => {
    expect(getFreshnessStatus(Infinity)).toBe('unknown')
    expect(getFreshnessStatus(NaN)).toBe('unknown')
  })
})

describe('MarketIntelMonitorService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for run create returns a run object
    mockRunCreate.mockResolvedValue({
      id: 'run-1',
      organisationId: 'org-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      key: 'chanel::classic flap',
      brand: 'Chanel',
      model: 'Classic Flap',
      mode: 'background',
      status: 'queued',
    })

    // Default mock for run set - returns updated run with the fields that were set
    mockRunSet.mockImplementation((_id: string, fields: Record<string, unknown>) =>
      Promise.resolve({
        id: 'run-1',
        organisationId: 'org-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        key: 'chanel::classic flap',
        brand: 'Chanel',
        model: 'Classic Flap',
        mode: 'background',
        status: 'running',
        ...fields,
      }),
    )

    // Default mock for snapshot upsert
    mockSnapshotUpsertByKey.mockResolvedValue({
      id: 'snap-1',
      generatedAt: new Date().toISOString(),
      freshnessStatus: 'live',
      snapshotAgeMinutes: 0,
      key: 'chanel::classic flap',
      brand: 'Chanel',
      model: 'Classic Flap',
      organisationId: 'org-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cached: false,
      result: mockAnalyseResult,
    })

    // Default mock for analyse
    mockAnalyse.mockResolvedValue(mockAnalyseResult)
  })

  describe('runBackground', () => {
    it('creates run with aiUsage callCount=3 and provider from result', async () => {
      const { MarketIntelMonitorService } = await import('./MarketIntelMonitorService')
      const service = new MarketIntelMonitorService()

      const { run } = await service.runBackground({
        brand: 'Chanel',
        model: 'Classic Flap',
        category: 'Handbag',
        condition: 'excellent',
      })

      // The runRepo.set should have been called with aiUsage on the succeeded path
      const setCallsWithSucceeded = mockRunSet.mock.calls.filter(
        ([, fields]) => (fields as Record<string, unknown>).status === 'succeeded',
      )
      expect(setCallsWithSucceeded).toHaveLength(1)

      const succeededFields = setCallsWithSucceeded[0][1] as Record<string, unknown>
      expect(succeededFields.aiUsage).toBeDefined()

      const aiUsage = succeededFields.aiUsage as { callCount: number; provider: string; estimatedCostEur: number }
      expect(aiUsage.callCount).toBe(3)
      expect(aiUsage.provider).toBe('openai')
      expect(aiUsage.estimatedCostEur).toBeGreaterThan(0)

      // The returned run should also contain aiUsage
      expect(run.aiUsage).toBeDefined()
      expect(run.aiUsage?.callCount).toBe(3)
      expect(run.aiUsage?.provider).toBe('openai')
    })
  })

  describe('runDeepDive', () => {
    it('creates run with aiUsage and mode=deep_dive', async () => {
      vi.resetModules()
      const { MarketIntelMonitorService } = await import('./MarketIntelMonitorService')
      const service = new MarketIntelMonitorService()

      mockRunCreate.mockResolvedValue({
        id: 'run-2',
        organisationId: 'org-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        key: 'chanel::classic flap',
        brand: 'Chanel',
        model: 'Classic Flap',
        mode: 'deep_dive',
        status: 'queued',
      })

      mockRunSet.mockImplementation((_id: string, fields: Record<string, unknown>) =>
        Promise.resolve({
          id: 'run-2',
          organisationId: 'org-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          key: 'chanel::classic flap',
          brand: 'Chanel',
          model: 'Classic Flap',
          mode: 'deep_dive',
          status: 'running',
          ...fields,
        }),
      )

      const { run } = await service.runDeepDive({
        brand: 'Chanel',
        model: 'Classic Flap',
        category: 'Handbag',
        condition: 'excellent',
      })

      // run should have mode deep_dive
      expect(run.mode).toBe('deep_dive')

      // The runRepo.set should have been called with aiUsage on the succeeded path
      const setCallsWithSucceeded = mockRunSet.mock.calls.filter(
        ([, fields]) => (fields as Record<string, unknown>).status === 'succeeded',
      )
      expect(setCallsWithSucceeded).toHaveLength(1)

      const succeededFields = setCallsWithSucceeded[0][1] as Record<string, unknown>
      expect(succeededFields.aiUsage).toBeDefined()

      const aiUsage = succeededFields.aiUsage as { callCount: number; provider: string; estimatedCostEur: number }
      expect(aiUsage.callCount).toBe(3)
      expect(aiUsage.provider).toBe('openai')
    })
  })

  describe('listSnapshots', () => {
    it('returns snapshots with computed freshnessStatus', async () => {
      vi.resetModules()
      const { MarketIntelMonitorService } = await import('./MarketIntelMonitorService')
      const service = new MarketIntelMonitorService()

      // Create a snapshot with an old generatedAt — service should compute freshness dynamically
      const oldGeneratedAt = new Date(Date.now() - 60 * 60 * 1000 * 24 * 7).toISOString() // 7 days ago
      mockSnapshotListRecent.mockResolvedValue([
        {
          id: 'snap-old',
          organisationId: 'org-1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          key: 'chanel::classic flap',
          brand: 'Chanel',
          model: 'Classic Flap',
          generatedAt: oldGeneratedAt,
          snapshotAgeMinutes: 0, // stale stored value — should be recomputed
          freshnessStatus: 'live', // stale stored value — should be recomputed
          cached: false,
          result: mockAnalyseResult,
        },
      ])

      const snapshots = await service.listSnapshots()

      expect(snapshots).toHaveLength(1)
      // Service should recompute freshness — 7 days old should be 'expired' or 'stale'
      expect(['stale', 'expired']).toContain(snapshots[0].freshnessStatus)
      // snapshotAgeMinutes should be computed (>> 0)
      expect(snapshots[0].snapshotAgeMinutes).toBeGreaterThan(0)
    })
  })
})
