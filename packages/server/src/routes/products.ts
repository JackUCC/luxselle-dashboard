/**
 * Products API: CRUD, list (search/sort/cursor), image upload (multer+sharp→Storage), transactions sub-resource.
 * @see docs/CODE_REFERENCE.md
 * References: Express, multer, sharp, Firebase Storage, @shared/schemas
 */
import { Router } from 'express'
import { z } from 'zod'
import multer from 'multer'
import sharp from 'sharp'
import { randomUUID } from 'crypto'
import { DEFAULT_ORG_ID, ProductSchema, ProductStatusSchema, type ProductImage } from '@shared/schemas'
import { ProductRepo } from '../repos/ProductRepo'
import { TransactionRepo } from '../repos/TransactionRepo'
import { ActivityEventRepo } from '../repos/ActivityEventRepo'
import { storage } from '../config/firebase'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'
import * as XLSX from 'xlsx'

const router = Router()
const productRepo = new ProductRepo()
const transactionRepo = new TransactionRepo()
const activityRepo = new ActivityEventRepo()

// Multer config for image uploads (10MB max)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  },
})

// Request body validation for create (POST) and update (PUT)
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

// GET /api/products - List products with optional cursor pagination
// Query params: limit (default 50), cursor, sort (default createdAt), dir (asc/desc)
router.get('/', async (req, res, next) => {
  try {
    const { limit, cursor, sort, dir, q } = req.query
    let products = await productRepo.list()

    // Text search (simple client-side for now)
    if (q && typeof q === 'string') {
      const query = q.toLowerCase()
      products = products.filter(p =>
        p.brand.toLowerCase().includes(query) ||
        p.model.toLowerCase().includes(query)
      )
    }

    // Sort
    const sortField = (sort as string) || 'createdAt'
    const sortDir = dir === 'asc' ? 1 : -1
    products.sort((a, b) => {
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
      const cursorIndex = products.findIndex(p => p.id === cursor)
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1
      }
    }

    const paginatedProducts = products.slice(startIndex, startIndex + limitNum)
    const nextCursor = paginatedProducts.length === limitNum && startIndex + limitNum < products.length
      ? paginatedProducts[paginatedProducts.length - 1]?.id
      : null

    res.json({
      data: paginatedProducts,
      nextCursor,
      total: products.length,
    })
  } catch (error) {
    next(error)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const product = await productRepo.getById(req.params.id)
    if (!product) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Product not found'))
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
      images: [],
      notes: input.notes ?? '',
    })
    const created = await productRepo.create(product)

    // Create activity event
    await activityRepo.create({
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      actor: 'system',
      eventType: 'product_created',
      entityType: 'product',
      entityId: created.id,
      payload: {
        brand: created.brand,
        model: created.model,
      },
    })

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

// --- Import from Excel/CSV (must be before /:id routes so POST /import is not matched by /:id/images) ---

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

router.post('/import', importUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'No file provided'))
      return
    }

    const isCsv =
      req.file.mimetype === 'text/csv' ||
      req.file.originalname.toLowerCase().endsWith('.csv')

    let rows: Record<string, unknown>[]
    if (isCsv) {
      const str = req.file.buffer.toString('utf8')
      const wb = XLSX.read(str, { type: 'string' })
      const sheetName = wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[]
    } else {
      const wb = XLSX.read(req.file.buffer, { type: 'buffer' })
      const sheetName = wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[]
    }

    if (rows.length === 0) {
      res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'File is empty'))
      return
    }

    const now = new Date().toISOString()
    let createdCount = 0
    let errorCount = 0
    const errors: { row: number; error: string }[] = []

    const normalizeKey = (obj: Record<string, unknown>, key: string) => {
      const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase())
      return foundKey ? obj[foundKey] : undefined
    }

    const parseNum = (val: unknown) => {
      if (typeof val === 'number') return val
      if (typeof val === 'string') {
        const n = parseFloat(val.replace(/[^0-9.-]+/g, ''))
        return isNaN(n) ? 0 : n
      }
      return 0
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        const brand = String(normalizeKey(row, 'brand') || normalizeKey(row, 'brand name') || '').trim()
        const model = String(normalizeKey(row, 'model') || normalizeKey(row, 'product name') || normalizeKey(row, 'title') || '').trim()

        if (!brand && !model) continue

        const category = String(normalizeKey(row, 'category') || '').trim()
        const condition = String(normalizeKey(row, 'condition') || '').trim()
        const colour = String(normalizeKey(row, 'colour') || normalizeKey(row, 'color') || '').trim()

        const costPriceEur = parseNum(
          normalizeKey(row, 'cost eur') ?? normalizeKey(row, 'cost') ?? normalizeKey(row, 'cost price') ?? normalizeKey(row, 'invoice price') ?? 0
        )
        const sellPriceEur = parseNum(
          normalizeKey(row, 'sell eur') ?? normalizeKey(row, 'sell') ?? normalizeKey(row, 'sell price') ?? normalizeKey(row, 'price') ?? 0
        )
        const quantity = Math.max(0, Math.floor(parseNum(normalizeKey(row, 'quantity') ?? normalizeKey(row, 'qty') ?? 1)))

        let status = String(normalizeKey(row, 'status') ?? 'in_stock').toLowerCase().replace(/\s+/g, '_')
        if (!['in_stock', 'sold', 'reserved'].includes(status)) status = 'in_stock'
        if (quantity === 0) status = 'sold'

        const product = ProductSchema.parse({
          organisationId: DEFAULT_ORG_ID,
          createdAt: now,
          updatedAt: now,
          currency: 'EUR',
          status: status as 'in_stock' | 'sold' | 'reserved',
          brand: brand || 'Unknown',
          model: model || 'Unknown',
          category,
          condition,
          colour,
          costPriceEur,
          sellPriceEur,
          quantity,
          images: [],
          imageUrls: [],
          notes: `Imported via web. Row ${i + 2}`,
        })

        await productRepo.create(product)
        createdCount++
      } catch (err: unknown) {
        errorCount++
        errors.push({ row: i + 2, error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    res.json({
      data: {
        created: createdCount,
        errors: errorCount,
        errorDetails: errors.slice(0, 10),
      },
    })
  } catch (error) {
    next(error)
  }
})

// --- Image upload: resize with sharp, upload original + thumbnail to Firebase Storage, update product.images ---

router.post('/:id/images', upload.single('image'), async (req, res, next) => {
  try {
    const { id } = req.params
    const product = await productRepo.getById(id)
    if (!product) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Product not found'))
      return
    }
    if (!req.file) {
      res.status(400).json(formatApiError(API_ERROR_CODES.VALIDATION, 'No image file provided'))
      return
    }

    const imageId = randomUUID()
    const now = new Date().toISOString()
    const bucket = storage.bucket()

    // Resize original (max 2000px) and thumbnail (max 512px), JPEG
    const originalBuffer = await sharp(req.file.buffer)
      .resize(2000, 2000, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer()

    // Generate thumbnail (512px max edge)
    const thumbnailBuffer = await sharp(req.file.buffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()

    // Upload to Storage and make public; keep path for deletion
    const originalPath = `products/${id}/${imageId}.jpg`
    const originalFile = bucket.file(originalPath)
    await originalFile.save(originalBuffer, {
      contentType: 'image/jpeg',
      metadata: { cacheControl: 'public, max-age=31536000' },
    })
    await originalFile.makePublic()
    const originalUrl = `https://storage.googleapis.com/${bucket.name}/${originalPath}`

    // Upload thumbnail
    const thumbnailPath = `products/${id}/${imageId}_thumb.jpg`
    const thumbnailFile = bucket.file(thumbnailPath)
    await thumbnailFile.save(thumbnailBuffer, {
      contentType: 'image/jpeg',
      metadata: { cacheControl: 'public, max-age=31536000' },
    })
    await thumbnailFile.makePublic()
    const thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${thumbnailPath}`

    // Create image object
    const newImage: ProductImage = {
      id: imageId,
      url: originalUrl,
      thumbnailUrl,
      path: originalPath,
      createdAt: now,
    }

    // Update product with new image
    const images = [...(product.images ?? []), newImage]
    // Also update legacy imageUrls for backwards compatibility
    const imageUrls = [...(product.imageUrls ?? []), originalUrl]

    const updated = await productRepo.set(id, {
      images,
      imageUrls,
      updatedAt: now,
    })

    res.status(201).json({ data: newImage, product: updated })
  } catch (error) {
    next(error)
  }
})

// DELETE /api/products/:id/images/:imageId - Delete image
router.delete('/:id/images/:imageId', async (req, res, next) => {
  try {
    const { id, imageId } = req.params
    const product = await productRepo.getById(id)

    if (!product) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Product not found'))
      return
    }

    const images = product.images ?? []
    const imageToDelete = images.find(img => img.id === imageId)

    if (!imageToDelete) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Image not found'))
      return
    }

    // Delete from Firebase Storage
    const bucket = storage.bucket()
    try {
      await bucket.file(imageToDelete.path).delete()
      // Also delete thumbnail if path exists
      const thumbPath = imageToDelete.path.replace('.jpg', '_thumb.jpg')
      await bucket.file(thumbPath).delete()
    } catch {
      // Ignore storage deletion errors (file may not exist)
    }

    // Update product
    const now = new Date().toISOString()
    const updatedImages = images.filter(img => img.id !== imageId)
    const updatedImageUrls = (product.imageUrls ?? []).filter(url => url !== imageToDelete.url)

    const updated = await productRepo.set(id, {
      images: updatedImages,
      imageUrls: updatedImageUrls,
      updatedAt: now,
    })

    res.json({ data: updated })
  } catch (error) {
    next(error)
  }
})

// --- Transaction history: list and create (sale/adjustment); sale updates product status to sold ---

router.get('/:id/transactions', async (req, res, next) => {
  try {
    const { id } = req.params
    const product = await productRepo.getById(id)

    if (!product) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Product not found'))
      return
    }

    const transactions = await transactionRepo.findByProductId(id)
    res.json({ data: transactions })
  } catch (error) {
    next(error)
  }
})

// POST /api/products/:id/transactions - Create a transaction (sale/adjustment)
const TransactionInputSchema = z.object({
  type: z.enum(['sale', 'adjustment']),
  amountEur: z.coerce.number(),
  notes: z.string().optional(),
})

router.post('/:id/transactions', async (req, res, next) => {
  try {
    const { id } = req.params
    const product = await productRepo.getById(id)

    if (!product) {
      res.status(404).json(formatApiError(API_ERROR_CODES.NOT_FOUND, 'Product not found'))
      return
    }

    const input = TransactionInputSchema.parse(req.body)
    const now = new Date().toISOString()

    // Create transaction
    const transaction = await transactionRepo.create({
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      type: input.type,
      productId: id,
      amountEur: input.amountEur,
      occurredAt: now,
      notes: input.notes ?? '',
    })

    // If it's a sale, update product status
    if (input.type === 'sale') {
      await productRepo.set(id, {
        status: 'sold',
        updatedAt: now,
      })
    }

    // Create activity event
    await activityRepo.create({
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      actor: 'system',
      eventType: input.type === 'sale' ? 'product_sold' : 'product_adjusted',
      entityType: 'product',
      entityId: id,
      payload: {
        brand: product.brand,
        model: product.model,
        amountEur: input.amountEur,
        type: input.type,
      },
    })

    res.status(201).json({ data: transaction })
  } catch (error) {
    next(error)
  }
})

export { router as productsRouter }
