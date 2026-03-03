import { DEFAULT_ORG_ID } from '@shared/schemas'
import type { MarketIntelFreshnessStatus, MarketIntelMode, MarketResearchResult } from '@shared/schemas'
import type { WithId } from '../../repos/BaseRepo'
import { MarketIntelRunRepo } from '../../repos/MarketIntelRunRepo'
import { MarketIntelSnapshotRepo } from '../../repos/MarketIntelSnapshotRepo'
import { MarketResearchService, type MarketResearchInput } from './MarketResearchService'
import type { MarketIntelRun, MarketIntelSnapshot } from '@shared/schemas'
import { env } from '../../config/env'

const COST_PER_CALL_EUR = 0.004
const STANDARD_ANALYSE_CALL_COUNT = 3  // expandQuery + searchMarket + extractStructuredJson

const LIVE_MAX_AGE_MINUTES = env.MARKET_INTEL_LIVE_MAX_AGE_MINUTES
const FRESH_MAX_AGE_MINUTES = env.MARKET_INTEL_FRESH_MAX_AGE_MINUTES
const STALE_MAX_AGE_MINUTES = env.MARKET_INTEL_STALE_MAX_AGE_MINUTES

function toKey(input: Pick<MarketResearchInput, 'brand' | 'model'>): string {
  return `${input.brand}::${input.model}`.trim().toLowerCase().replace(/\s+/g, ' ')
}

function computeAgeMinutes(generatedAt: string): number {
  const ageMs = Date.now() - new Date(generatedAt).getTime()
  if (!Number.isFinite(ageMs) || ageMs <= 0) return 0
  return Math.max(0, Math.round(ageMs / 60000))
}

export function getFreshnessStatus(ageMinutes: number): MarketIntelFreshnessStatus {
  if (!Number.isFinite(ageMinutes)) return 'unknown'
  if (ageMinutes <= LIVE_MAX_AGE_MINUTES) return 'live'
  if (ageMinutes <= FRESH_MAX_AGE_MINUTES) return 'fresh'
  if (ageMinutes <= STALE_MAX_AGE_MINUTES) return 'stale'
  return 'expired'
}

export class MarketIntelMonitorService {
  private readonly marketResearchService = new MarketResearchService()
  private readonly snapshotRepo = new MarketIntelSnapshotRepo()
  private readonly runRepo = new MarketIntelRunRepo()

  async listSnapshots(limit = 20): Promise<WithId<MarketIntelSnapshot>[]> {
    const snapshots = await this.snapshotRepo.listRecent(limit)
    return snapshots.map((snapshot) => this.withComputedFreshness(snapshot))
  }

  async getLatestSnapshot(input: Pick<MarketResearchInput, 'brand' | 'model'>): Promise<WithId<MarketIntelSnapshot> | null> {
    const snapshot = await this.snapshotRepo.findLatestByKey(toKey(input))
    return snapshot ? this.withComputedFreshness(snapshot) : null
  }

  async runBackground(input: MarketResearchInput): Promise<{
    run: WithId<MarketIntelRun>
    snapshot: WithId<MarketIntelSnapshot>
    result: MarketResearchResult
  }> {
    return this.executeRun(input, 'background')
  }

  async runDeepDive(input: MarketResearchInput): Promise<{
    run: WithId<MarketIntelRun>
    snapshot: WithId<MarketIntelSnapshot>
    result: MarketResearchResult
  }> {
    return this.executeRun(input, 'deep_dive')
  }

  private withComputedFreshness(snapshot: WithId<MarketIntelSnapshot>): WithId<MarketIntelSnapshot> {
    const snapshotAgeMinutes = computeAgeMinutes(snapshot.generatedAt)
    return {
      ...snapshot,
      snapshotAgeMinutes,
      freshnessStatus: getFreshnessStatus(snapshotAgeMinutes),
      cached: snapshotAgeMinutes > 0,
      result: this.addIntelMeta(snapshot.result, {
        runId: snapshot.runId,
        mode: snapshot.mode,
        generatedAt: snapshot.generatedAt,
        snapshotAgeMinutes,
        freshnessStatus: getFreshnessStatus(snapshotAgeMinutes),
        cached: snapshotAgeMinutes > 0,
      }),
    }
  }

  private addIntelMeta(
    result: MarketResearchResult,
    intel: {
      runId?: string
      mode?: MarketIntelMode
      generatedAt: string
      snapshotAgeMinutes: number
      freshnessStatus: MarketIntelFreshnessStatus
      cached: boolean
    },
  ): MarketResearchResult {
    return {
      ...result,
      intel: {
        ...(result.intel ?? {}),
        runId: intel.runId,
        mode: intel.mode,
        generatedAt: intel.generatedAt,
        snapshotAgeMinutes: intel.snapshotAgeMinutes,
        freshnessStatus: intel.freshnessStatus,
        cached: intel.cached,
      },
    }
  }

  private async executeRun(input: MarketResearchInput, mode: 'background' | 'deep_dive'): Promise<{
    run: WithId<MarketIntelRun>
    snapshot: WithId<MarketIntelSnapshot>
    result: MarketResearchResult
  }> {
    const now = new Date().toISOString()
    const key = toKey(input)
    const queuedRun = await this.runRepo.create({
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      key,
      brand: input.brand,
      model: input.model,
      category: input.category,
      condition: input.condition,
      mode,
      status: 'queued',
    })

    const runningAt = new Date().toISOString()
    const runningRun = await this.runRepo.set(queuedRun.id, {
      status: 'running',
      startedAt: runningAt,
      updatedAt: runningAt,
    })

    try {
      const analysed = await this.marketResearchService.analyse(input)
      const generatedAt = new Date().toISOString()
      const snapshotAgeMinutes = 0
      const freshnessStatus = getFreshnessStatus(snapshotAgeMinutes)

      const enrichedResult = this.addIntelMeta(analysed, {
        runId: runningRun.id,
        mode,
        generatedAt,
        snapshotAgeMinutes,
        freshnessStatus,
        cached: false,
      })

      const aiUsage = {
        callCount: STANDARD_ANALYSE_CALL_COUNT,
        provider: enrichedResult.provider,
        estimatedCostEur: Math.round(STANDARD_ANALYSE_CALL_COUNT * COST_PER_CALL_EUR * 1000) / 1000,
      }

      const snapshot = await this.snapshotRepo.upsertByKey(key, {
        organisationId: DEFAULT_ORG_ID,
        brand: input.brand,
        model: input.model,
        category: input.category,
        condition: input.condition,
        generatedAt,
        snapshotAgeMinutes,
        freshnessStatus,
        runId: runningRun.id,
        mode,
        cached: false,
        result: enrichedResult,
      })

      const completedAt = new Date().toISOString()
      const completedRun = await this.runRepo.set(runningRun.id, {
        status: 'succeeded',
        completedAt,
        snapshotId: snapshot.id,
        result: enrichedResult,
        updatedAt: completedAt,
      })

      return { run: completedRun, snapshot, result: enrichedResult }
    } catch (error) {
      const completedAt = new Date().toISOString()
      const failedRun = await this.runRepo.set(runningRun.id, {
        status: 'failed',
        completedAt,
        error: error instanceof Error ? error.message : String(error),
        updatedAt: completedAt,
      })
      throw new Error(failedRun.error ?? 'Failed to execute market intelligence run')
    }
  }
}
