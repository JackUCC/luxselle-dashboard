import { Router } from 'express'
import { z } from 'zod'
import { DEFAULT_ORG_ID, ProductSchema, ProductStatusSchema } from '@shared/schemas'
import { ProductRepo } from '../repos/ProductRepo'

const router = Router()
const productRepo = new ProductRepo()

const ProductInputSchema = z.object({
  brand: z.string(),
  model: z.string(),
  category: z.string().optional(),
  condition: z.string().optional(),
  colour: z.string().optional(),
  costPriceEur: z.coerce.number(),
  sellPriceEur: z.coerce.number(),
  status: ProductStatusSchema,
  quantity: z.coerce.number().int().min(0).optional(),
  imageUrls: z.array(z.string().url()).optional(),
  notes: z.string().optional(),
})

const ProductUpdateSchema = ProductInputSchema.partial()

router.get('/', async (_req, res, next) => {
  try {
    const products = await productRepo.list()
    res.json({ data: products })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const product = await productRepo.getById(req.params.id)
    if (!product) {
      res.status(404).json({ error: 'Product not found' })
      return
    }
    res.json({ data: product })
  } catch (error) {
    next(error)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const input = ProductInputSchema.parse(req.body)
    const now = new Date().toISOString()
    const product = ProductSchema.parse({
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      currency: 'EUR',
      status: input.status,
      brand: input.brand,
      model: input.model,
      category: input.category ?? '',
      condition: input.condition ?? '',
      colour: input.colour ?? '',
      costPriceEur: input.costPriceEur,
      sellPriceEur: input.sellPriceEur,
      quantity: input.quantity ?? 1,
      imageUrls: input.imageUrls ?? [],
      notes: input.notes ?? '',
    })
    const created = await productRepo.create(product)
    res.status(201).json({ data: created })
  } catch (error) {
    next(error)
  }
})

router.put('/:id', async (req, res, next) => {
  try {
    const input = ProductUpdateSchema.parse(req.body)
    const now = new Date().toISOString()
    const updated = await productRepo.set(req.params.id, {
      ...input,
      updatedAt: now,
    })
    res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    await productRepo.remove(req.params.id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

export { router as productsRouter }
