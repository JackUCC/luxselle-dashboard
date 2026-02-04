/**
 * Buying list API: CRUD for buying list items; links to products and suppliers.
 * @see docs/CODE_REFERENCE.md
 * References: Express, @shared/schemas, repos
 */
import { Router } from 'express'
import { z } from 'zod'
import {
  DEFAULT_ORG_ID,
  BuyingListItemSchema,
  BuyingListStatusSchema,
  ProductSchema,
  TransactionSchema,
  ActivityEventSchema,
} from '@shared/schemas'
import { BuyingListItemRepo } from '../repos/BuyingListItemRepo'
import { ProductRepo } from '../repos/ProductRepo'
import { TransactionRepo } from '../repos/TransactionRepo'
import { ActivityEventRepo } from '../repos/ActivityEventRepo'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const router = Router()
const buyingListRepo = new BuyingListItemRepo()
const productRepo = new ProductRepo()
const transactionRepo = new TransactionRepo()
const activityRepo = new ActivityEventRepo()

const BuyingListItemInputSchema = z.object({
  sourceType: z.enum(['manual', 'evaluator', 'supplier']),
  supplierId: z.string().optional(),
  supplierItemId: z.string().optional(),
  evaluationId: z.string().optional(),
  brand: z.string(),
  model: z.string(),
  category: z.string().optional(),
  condition: z.string().optional(),
  colour: z.string().optional(),
  targetBuyPriceEur: z.coerce.number(),
  status: BuyingListStatusSchema.optional().default('pending'),
  notes: z.string().optional(),
})

const BuyingListItemUpdateSchema = BuyingListItemInputSchema.partial()

// List with filters: q (search), status, supplier; cursor pagination; sort/dir
router.get('/', async (req, res, next) => {
  try {
    const { q, status, supplier, limit, cursor, sort, dir } = req.query
    let items = await buyingListRepo.list()
    
    // Text search
    if (q && typeof q === 'string') {
      const query = q.toLowerCase()
      items = items.filter(item => 
        item.brand.toLowerCase().includes(query) ||
        item.model.toLowerCase().includes(query)
      )
    }
    
    // Status filter
    if (status && typeof status === 'string') {
      items = items.filter(item => item.status === status)
    }
    
    // Supplier filter
    if (supplier && typeof supplier === 'string') {
      items = items.filter(item => item.supplierId === supplier)
    }
    
    // Sort
    const sortField = (sort as string) || 'createdAt'
    const sortDir = dir === 'asc' ? 1 : -1
    items.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortField]
      const bVal = (b as Record<string, unknown>)[sortField]
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * sortDir
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * sortDir
      }
      return 0
    })
    
    // Cursor pagination
    const limitNum = limit ? parseInt(String(limit)) : 50
    let startIndex = 0
    
    if (cursor && typeof cursor === 'string') {
      const cursorIndex = items.findIndex(item => item.id === cursor)
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1
      }
    }
    
    const paginated = items.slice(startIndex, startIndex + limitNum)
    const nextCursor = paginated.length === limitNum && startIndex + limitNum < items.length
      ? paginated[paginated.length - 1]?.id
      : null
    
    res.json({
      data: paginated,
      nextCursor,
      total: items.length,
    })
  } catch (error) {
    next(error)
  }
})

// Get single buying list item
router.get('/:id', async (req, res, next) => {
  try {
    const item = await buyingListRepo.getById(req.params.id)
    if (!item) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Buying list item not found'))
      return
    }
    res.json({ data: item })
  } catch (error) {
    next(error)
  }
})

// Create buying list item
router.post('/', async (req, res, next) => {
  try {
    const input = BuyingListItemInputSchema.parse(req.body)
    const now = new Date().toISOString()
    const item = BuyingListItemSchema.parse({
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      sourceType: input.sourceType,
      supplierId: input.supplierId,
      supplierItemId: input.supplierItemId,
      evaluationId: input.evaluationId,
      brand: input.brand,
      model: input.model,
      category: input.category ?? '',
      condition: input.condition ?? '',
      colour: input.colour ?? '',
      targetBuyPriceEur: input.targetBuyPriceEur,
      status: input.status ?? 'pending',
      notes: input.notes ?? '',
    })
    const created = await buyingListRepo.create(item)

    // Create activity event
    await activityRepo.create({
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      actor: 'system',
      eventType: 'buylist_added',
      entityType: 'buying_list_item',
      entityId: created.id,
      payload: { brand: created.brand, model: created.model },
    })

    res.status(201).json({ data: created })
  } catch (error) {
    next(error)
  }
})

// Update buying list item
router.put('/:id', async (req, res, next) => {
  try {
    const input = BuyingListItemUpdateSchema.parse(req.body)
    const now = new Date().toISOString()
    const updated = await buyingListRepo.set(req.params.id, {
      ...input,
      updatedAt: now,
    })
    res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

// Delete buying list item
router.delete('/:id', async (req, res, next) => {
  try {
    await buyingListRepo.remove(req.params.id)
    res.status(204).send()
  } catch (error) {
    next(error)
  }
})

// Receive buying list item (creates product, transaction, updates status)
// Uses atomic Firestore transaction to ensure data consistency
router.post('/:id/receive', async (req, res, next) => {
  try {
    const { id } = req.params
    const now = new Date().toISOString()
    
    // Use Firestore transaction for atomic writes
    const db = buyingListRepo.getFirestore()
    
    const result = await db.runTransaction(async (transaction) => {
      // 1. Get and validate buying list item
      const itemDoc = await transaction.get(db.collection('buying_list_items').doc(id))
      if (!itemDoc.exists) {
        throw new Error('NOT_FOUND')
      }
      
      const item = itemDoc.data()!
      if (item.status === 'received') {
        throw new Error('ALREADY_RECEIVED')
      }

      // 2. Create product document
      const productRef = db.collection('products').doc()
      const productData = ProductSchema.parse({
        organisationId: DEFAULT_ORG_ID,
        createdAt: now,
        updatedAt: now,
        brand: item.brand,
        model: item.model,
        category: item.category || '',
        condition: item.condition || '',
        colour: item.colour || '',
        costPriceEur: item.targetBuyPriceEur,
        sellPriceEur: item.targetBuyPriceEur * 1.5,
        currency: 'EUR',
        status: 'in_stock',
        quantity: 1,
        imageUrls: [],
        images: [],
        notes: `Received from buying list: ${id}`,
      })
      transaction.set(productRef, productData)

      // 3. Create transaction (purchase) document
      const txRef = db.collection('transactions').doc()
      const txData = TransactionSchema.parse({
        organisationId: DEFAULT_ORG_ID,
        createdAt: now,
        updatedAt: now,
        type: 'purchase',
        productId: productRef.id,
        buyingListItemId: id,
        amountEur: item.targetBuyPriceEur,
        occurredAt: now,
        notes: `Purchase: ${item.brand} ${item.model}`,
      })
      transaction.set(txRef, txData)

      // 4. Create activity event document
      const activityRef = db.collection('activity_events').doc()
      const activityData = {
        organisationId: DEFAULT_ORG_ID,
        createdAt: now,
        updatedAt: now,
        actor: 'system',
        eventType: 'buylist_received',
        entityType: 'buying_list_item',
        entityId: id,
        payload: {
          brand: item.brand,
          model: item.model,
          productId: productRef.id,
        },
      }
      transaction.set(activityRef, activityData)

      // 5. Update buying list item status
      transaction.update(db.collection('buying_list_items').doc(id), {
        status: 'received',
        updatedAt: now,
      })

      return {
        buyingListItem: { id, ...item, status: 'received', updatedAt: now },
        product: { id: productRef.id, ...productData },
      }
    })

    res.json({ data: result })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NOT_FOUND') {
        res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Buying list item not found'))
        return
      }
      if (error.message === 'ALREADY_RECEIVED') {
        res.status(400).json(formatApiError(API_ERROR_CODES.BAD_REQUEST, 'Item already received'))
        return
      }
    }
    next(error)
  }
})

export { router as buyingListRouter }
