/**
 * Market Research API: AI-powered market intelligence for luxury goods.
 * @see docs/CODE_REFERENCE.md
 * References: Express, MarketResearchService, Zod
 */
import { Router } from 'express'
import { z } from 'zod'
import { MarketResearchService } from '../services/market-research/MarketResearchService'
import { logger } from '../middleware/requestId'

const router = Router()
const marketResearchService = new MarketResearchService()

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
