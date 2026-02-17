import { Router } from 'express'
import { AiService } from '../services/ai/AiService'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const router = Router()
const aiService = new AiService()

// POST /api/ai/generate-description
router.post('/generate-description', async (req, res, next) => {
    try {
        const { product } = req.body
        if (!product) {
            res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'Product data is required'))
            return
        }

        const description = await aiService.generateProductDescription(product)
        res.json({ data: { description } })
    } catch (error) {
        next(error)
    }
})

// GET /api/ai/insights
// Expects KPI data to be passed or (better) fetches it itself if we move KPI logic here. 
// For now, let's keep it simple: frontend or dashboard/kpis can pass data? 
// No, the service should probably fetch it to be "smart", but to avoid circular deps/duplication with dashboard router,
// let's have the frontend pass the context OR we accept that this route is "pure" AI processing.
// Actually, for "Business Insights", the backend should probably just "know" the stats.
// But re-implementing KPI fetching might be redundant.
// Let's implement it such that we can pass stats in the body for analysis, OR it fetches them.
// To keep it loosely coupled for this iteration, let's accept stats in the body.
router.post('/insights', async (req, res, next) => {
    try {
        const { kpis } = req.body
        if (!kpis) {
            // If no KPIs provided, we return standard/mock insights or error? 
            // Let's allow it to fail gracefully or provide generic advice.
            // For this MVP, we assume the frontend sends the KPIs it already has.
            // This avoids re-querying the DB every time just for the AI tip.
        }

        const insights = await aiService.generateBusinessInsights(kpis || {})
        res.json({ data: insights })
    } catch (error) {
        next(error)
    }
})

export { router as aiRouter }
