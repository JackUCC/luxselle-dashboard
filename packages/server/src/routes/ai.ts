import { Router } from 'express'
import { SerialDecodeHeuristicInputSchema } from '@shared/schemas'
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

// POST /api/ai/insights — optional KPI context in body, returns degraded shape when providers are unavailable
router.post('/insights', async (req, res, next) => {
    try {
        const { kpis } = req.body
        const insights = await aiService.generateBusinessInsights(kpis || {})
        res.json({ data: insights })
    } catch (error) {
        next(error)
    }
})

// POST /api/ai/prompt — simple prompt bar
router.post('/prompt', async (req, res, next) => {
    try {
        const { prompt: userPrompt } = req.body
        const prompt = typeof userPrompt === 'string' ? userPrompt.trim() : ''
        if (!prompt) {
            res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'Prompt is required'))
            return
        }

        const reply = await aiService.prompt(prompt)
        res.json({ data: { reply } })
    } catch (error) {
        next(error)
    }
})

// POST /api/ai/retail-lookup — what was this retail? (brand new price from description)
router.post('/retail-lookup', async (req, res, next) => {
    try {
        const { description } = req.body
        const text = typeof description === 'string' ? description.trim() : ''
        const result = await aiService.getRetailPriceFromDescription(text)
        res.json({ data: result })
    } catch (error) {
        next(error)
    }
})

// POST /api/ai/serial-decode — AI heuristic decode for all brands
router.post('/serial-decode', async (req, res, next) => {
    try {
        const input = SerialDecodeHeuristicInputSchema.parse(req.body)
        const result = await aiService.decodeSerialHeuristic(input)
        res.json({ data: result })
    } catch (error) {
        next(error)
    }
})

export { router as aiRouter }
