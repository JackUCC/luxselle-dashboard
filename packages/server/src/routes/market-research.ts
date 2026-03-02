/**
 * Market Research API: AI-powered market intelligence for luxury goods.
 * @see docs/CODE_REFERENCE.md
 * References: Express, MarketResearchService, Zod
 */
import { Router } from 'express'
import { z } from 'zod'
import { MarketResearchService } from '../services/market-research/MarketResearchService'
import { MarketIntelMonitorService } from '../services/market-research/MarketIntelMonitorService'
import { logger } from '../middleware/requestId'
import { SystemJobRepo } from '../repos/SystemJobRepo'
import { DEFAULT_ORG_ID } from '@shared/schemas'
import { runJob } from '../services/JobRunner'

const router = Router()
const marketResearchService = new MarketResearchService()
const marketIntelMonitorService = new MarketIntelMonitorService()
const systemJobRepo = new SystemJobRepo()

const MarketResearchInputSchema = z.object({
    brand: z.string().min(1),
    model: z.string().min(1),
    category: z.string().min(1),
    condition: z.string().min(1),
    colour: z.string().optional(),
    year: z.string().optional(),
    notes: z.string().optional(),
    currentAskPriceEur: z.coerce.number().optional(),
})

const SnapshotQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
})

const TriggerMonitorSchema = MarketResearchInputSchema.extend({
    mode: z.enum(['background']).optional(),
})

const DeepDiveInputSchema = MarketResearchInputSchema.extend({
    mode: z.enum(['deep_dive']).optional(),
})

// POST /api/market-research/analyse — deep market analysis
router.post('/analyse', async (req, res, next) => {
    let input: z.infer<typeof MarketResearchInputSchema>
    try {
        input = MarketResearchInputSchema.parse(req.body)
    } catch (parseError) {
        next(parseError)
        return
    }
    try {
        const result = await marketResearchService.analyse(input)
        res.json({ data: result })
    } catch (error) {
        logger.warn('market_research_analyse_fallback', {
            message: error instanceof Error ? error.message : String(error),
        })
        const degraded = marketResearchService.getDegradedAnalysis(
            input,
            'Market analysis temporarily unavailable.',
        )
        res.status(200).json({ data: degraded })
    }
})

// GET /api/market-research/snapshots — latest market-intel snapshots with freshness metadata
router.get('/snapshots', async (req, res, next) => {
    try {
        const query = SnapshotQuerySchema.parse(req.query)
        const snapshots = await marketIntelMonitorService.listSnapshots(query.limit ?? 20)
        const filtered = snapshots.filter((snapshot) => {
            if (query.brand && snapshot.brand.toLowerCase() !== query.brand.toLowerCase()) return false
            if (query.model && snapshot.model.toLowerCase() !== query.model.toLowerCase()) return false
            return true
        })
        res.json({ data: filtered })
    } catch (error) {
        next(error)
    }
})

// POST /api/market-research/trigger-monitor — queue background monitor run
router.post('/trigger-monitor', async (req, res, next) => {
    try {
        const input = TriggerMonitorSchema.parse(req.body)
        const now = new Date().toISOString()
        const job = await systemJobRepo.create({
            organisationId: DEFAULT_ORG_ID,
            createdAt: now,
            updatedAt: now,
            jobType: 'market_intel_monitor',
            status: 'queued',
            queuedAt: now,
            retryCount: 0,
            maxRetries: 3,
            input: {
                brand: input.brand,
                model: input.model,
                category: input.category,
                condition: input.condition,
                colour: input.colour,
                year: input.year,
                notes: input.notes,
                currentAskPriceEur: input.currentAskPriceEur,
            },
        })

        setImmediate(() => {
            Promise.resolve(runJob(job.id)).catch((err) => {
                logger.error('market_research_monitor_job_failed', {
                    jobId: job.id,
                    message: err instanceof Error ? err.message : String(err),
                })
            })
        })

        res.status(202).json({
            data: {
                jobId: job.id,
                status: 'queued',
            },
        })
    } catch (error) {
        next(error)
    }
})

// POST /api/market-research/deep-dive — run enriched on-demand analysis and persist snapshot/run telemetry
router.post('/deep-dive', async (req, res, next) => {
    try {
        const input = DeepDiveInputSchema.parse(req.body)
        const { run, result, snapshot } = await marketIntelMonitorService.runDeepDive(input)
        res.json({
            data: {
                runId: run.id,
                result,
                snapshot,
            },
        })
    } catch (error) {
        next(error)
    }
})

// GET /api/market-research/trending — trending luxury items
router.get('/trending', async (_req, res, next) => {
    try {
        const result = await marketResearchService.getTrending()
        res.json({ data: result })
    } catch (error) {
        next(error)
    }
})

// GET /api/market-research/competitor-feed — recent listings from Irish/EU competitors (Designer Exchange, Luxury Exchange, Siopella)
router.get('/competitor-feed', async (_req, res, next) => {
    try {
        const result = await marketResearchService.getCompetitorFeed()
        res.json({ data: result })
    } catch (error) {
        next(error)
    }
})

export { router as marketResearchRouter }
