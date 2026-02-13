import { DEFAULT_ORG_ID } from '@shared/schemas'
import { db } from '../src/config/firebase'
import {
  ActivityEventRepo,
  BuyingListItemRepo,
  EvaluationRepo,
  ProductRepo,
  SettingsRepo,
  SourcingRequestRepo,
  SupplierItemRepo,
  SupplierRepo,
  SystemJobRepo,
  TransactionRepo,
} from '../src/repos'

const dayMs = 24 * 60 * 60 * 1000
const baseDate = new Date('2026-01-01T10:00:00.000Z')
const isoAt = (offsetDays: number) =>
  new Date(baseDate.getTime() + offsetDays * dayMs).toISOString()

const withBase = (offsetDays: number) => ({
  organisationId: DEFAULT_ORG_ID,
  createdAt: isoAt(offsetDays),
  updatedAt: isoAt(offsetDays),
})

const brands = [
  'Chanel',
  'Louis Vuitton',
  'Hermès',
  'Gucci',
  'Prada',
  'Dior',
  'Fendi',
  'Bottega Veneta',
  'Loewe',
  'Givenchy',
]

const models = [
  'Classic Flap',
  'Neverfull',
  'Birkin',
  'Jackie',
  'Galleria',
  'Lady Dior',
  'Baguette',
  'Pouch',
  'Puzzle',
  'Antigona',
]

const categories = ['handbag', 'tote', 'clutch', 'crossbody']
const conditions = ['new', 'excellent', 'good', 'fair']
const colours = ['black', 'silver', 'gold', 'blue', 'green']

async function clearCollection(name: string) {
  const snapshot = await db.collection(name).get()
  if (snapshot.empty) return
  const batch = db.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
}

async function seed() {
  process.env.FIREBASE_USE_EMULATOR =
    process.env.FIREBASE_USE_EMULATOR ?? 'true'

  const reposToClear = [
    'products',
    'suppliers',
    'supplier_items',
    'sourcing_requests',
    'buying_list_items',
    'transactions',
    'evaluations',
    'activity_events',
    'settings',
    'system_jobs',
  ]

  for (const name of reposToClear) {
    await clearCollection(name)
  }

  const productRepo = new ProductRepo()
  const supplierRepo = new SupplierRepo()
  const supplierItemRepo = new SupplierItemRepo()
  const sourcingRepo = new SourcingRequestRepo()
  const buyingListRepo = new BuyingListItemRepo()
  const transactionRepo = new TransactionRepo()
  const evaluationRepo = new EvaluationRepo()
  const activityRepo = new ActivityEventRepo()
  const settingsRepo = new SettingsRepo()
  const systemJobRepo = new SystemJobRepo()

  await settingsRepo.upsertSettings({
    ...withBase(0),
    baseCurrency: 'EUR',
    targetMarginPct: 35,
    lowStockThreshold: 2,
    fxUsdToEur: 0.92,
    vatRatePct: 20,
    pricingMarketCountryDefault: 'IE',
    pricingMarketMode: 'ie_first_eu_fallback',
    pricingIeSourceAllowlist: ['designerexchange.ie', 'luxuryexchange.ie', 'siopaella.com'],
    importVatPctDefault: 23,
    auctionPlatforms: [
      {
        id: 'hibid-ie',
        name: 'HiBid IE',
        buyerPremiumPct: 15,
        platformFeePct: 0,
        fixedFeeEur: 0,
        paymentFeePct: 2,
        defaultShippingEur: 40,
        defaultInsuranceEur: 8,
        defaultCustomsDutyPct: 3,
        defaultImportVatPct: 23,
        enabled: true,
      },
      {
        id: 'catawiki',
        name: 'Catawiki',
        buyerPremiumPct: 9,
        platformFeePct: 0,
        fixedFeeEur: 0,
        paymentFeePct: 2,
        defaultShippingEur: 35,
        defaultInsuranceEur: 5,
        defaultCustomsDutyPct: 3,
        defaultImportVatPct: 23,
        enabled: true,
      },
    ],
  })

  const regions = ['Japan', 'France', 'Italy', 'USA']
  const statuses = ['active', 'inactive', 'error'] as const

  const suppliers = await Promise.all(
    Array.from({ length: 10 }).map((_, index) =>
      supplierRepo.create({
        ...withBase(index),
        name: `Supplier ${index + 1}`,
        contactName: `Contact ${index + 1}`,
        email: `supplier${index + 1}@example.com`,
        phone: `+33 6 00 00 00 ${index + 1}`,
        notes: 'Seeded supplier',
        status: statuses[index % statuses.length],
        region: regions[index % regions.length],
        itemCount: 40 + index * 12,
        heroImageUrl: `https://placehold.co/600x400?text=Supplier+${index + 1}`,
        sourceEmails: [`supplier${index + 1}@example.com`],
        importTemplate: {
          columnMap: {
            externalId: 'SKU',
            title: 'Title',
            brand: 'Brand',
            sku: 'SKU',
            conditionRank: 'Rank',
            askPriceUsd: 'For you in USD',
            sellingPriceUsd: 'Selling Price',
            availability: 'STATUS',
          },
          availabilityMap: {
            UPLOADED: 'uploaded',
            SOLD: 'sold',
            WAITING: 'waiting',
          },
          defaultAvailability: 'uploaded',
          trimValues: true,
        },
      }),
    ),
  )

  const supplierItems = []
  for (let i = 0; i < 50; i += 1) {
    const supplier = suppliers[i % suppliers.length]
    const brand = brands[i % brands.length]
    const model = models[i % models.length]
    const askUsd = 500 + i * 25
    const askEur = Number((askUsd * 0.92).toFixed(2))
    const item = await supplierItemRepo.create({
      ...withBase(i),
      supplierId: supplier.id,
      externalId: `BST-${1000 + i}`,
      title: `${brand} ${model}`,
      brand,
      sku: `SKU-${1000 + i}`,
      conditionRank: conditions[i % conditions.length],
      askPriceUsd: askUsd,
      askPriceEur: askEur,
      sellingPriceUsd: askUsd + 200,
      sellingPriceEur: Number(((askUsd + 200) * 0.92).toFixed(2)),
      availability: i % 3 === 0 ? 'sold' : i % 3 === 1 ? 'uploaded' : 'waiting',
      imageUrl: 'https://placehold.co/300x300.png',
      sourceUrl: 'https://example.com/source',
      rawPayload: { seed: true, index: i },
      lastSeenAt: isoAt(i),
    })
    supplierItems.push(item)
  }

  const evaluations = []
  for (let i = 0; i < 15; i += 1) {
    const e = await evaluationRepo.create({
      ...withBase(i),
      brand: brands[i % brands.length],
      model: models[i % models.length],
      category: categories[i % categories.length],
      condition: conditions[i % conditions.length],
      colour: colours[i % colours.length],
      notes: 'Seeded evaluation',
      askPriceEur: 1000 + i * 50,
      estimatedRetailEur: 2000 + i * 75,
      maxBuyPriceEur: 1300 + i * 40,
      historyAvgPaidEur: 1100 + i * 30,
      comps: [],
      confidence: 0.7,
      provider: 'mock',
    })
    evaluations.push(e)
  }

  const products = []
  for (let i = 0; i < 90; i += 1) {
    const brand = brands[i % brands.length]
    const model = models[i % models.length]
    const product = await productRepo.create({
      ...withBase(i),
      brand,
      model,
      category: categories[i % categories.length],
      condition: conditions[i % conditions.length],
      colour: colours[i % colours.length],
      costPriceEur: 900 + i * 20,
      sellPriceEur: 1400 + i * 30,
      currency: 'EUR',
      status: i % 5 === 0 ? 'reserved' : i % 7 === 0 ? 'sold' : 'in_stock',
      quantity: i % 4 === 0 ? 2 : 1,
      imageUrls: ['https://placehold.co/600x600.png'],
      images: [],
      notes: 'Seeded product',
    })
    products.push(product)
  }

  const buyingListItems = []
  const blStatuses: Array<'pending' | 'ordered' | 'received' | 'cancelled'> = [
    'pending',
    'pending',
    'ordered',
    'ordered',
    'received',
    'cancelled',
  ]
  for (let i = 0; i < 35; i += 1) {
    const brand = brands[i % brands.length]
    const model = models[i % models.length]
    const sourceType = i % 3 === 0 ? 'manual' : i % 3 === 1 ? 'supplier' : 'evaluator'
    const supplierItem = supplierItems[i % supplierItems.length]
    const evaluation = evaluations[i % evaluations.length]
    const status = blStatuses[i % blStatuses.length]
    const item = await buyingListRepo.create({
      ...withBase(i),
      sourceType,
      supplierId: sourceType === 'supplier' ? supplierItem.supplierId : undefined,
      supplierItemId: sourceType === 'supplier' ? supplierItem.id : undefined,
      evaluationId: sourceType === 'evaluator' ? evaluation.id : undefined,
      brand,
      model,
      category: categories[i % categories.length],
      condition: conditions[i % conditions.length],
      colour: colours[i % colours.length],
      targetBuyPriceEur: 800 + i * 15,
      status,
      notes: 'Seeded buy list item',
    })
    buyingListItems.push(item)
  }

  const soStatuses: Array<'open' | 'sourcing' | 'sourced' | 'fulfilled' | 'lost'> = [
    'open',
    'open',
    'sourcing',
    'sourcing',
    'sourced',
    'fulfilled',
    'lost',
  ]
  for (let i = 0; i < 28; i += 1) {
    await sourcingRepo.create({
      ...withBase(i),
      customerName: `Customer ${i + 1}`,
      queryText: `${brands[i % brands.length]} ${models[i % models.length]}`,
      brand: brands[i % brands.length],
      budget: 5000 + i * 250,
      priority: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
      status: soStatuses[i % soStatuses.length],
      notes: 'Seeded sourcing request',
    })
  }

  for (let i = 0; i < 60; i += 1) {
    const product = products[i % products.length]
    await transactionRepo.create({
      ...withBase(i),
      type: i % 5 === 0 ? 'sale' : 'purchase',
      productId: product.id,
      amountEur: 1000 + i * 40,
      occurredAt: isoAt(i),
      notes: 'Seeded transaction',
    })
  }

  const activityTypes = [
    { eventType: 'seed' as const, entityType: 'system' as const },
    { eventType: 'buylist_added' as const, entityType: 'buying_list_item' as const },
    { eventType: 'buylist_received' as const, entityType: 'buying_list_item' as const },
    { eventType: 'sourcing_created' as const, entityType: 'sourcing_request' as const },
    { eventType: 'sourcing_status_changed' as const, entityType: 'sourcing_request' as const },
    { eventType: 'supplier_import' as const, entityType: 'system' as const },
  ]
  for (let i = 0; i < 30; i += 1) {
    const t = activityTypes[i % activityTypes.length]
    const brand = brands[i % brands.length]
    const model = models[i % models.length]
    await activityRepo.create({
      ...withBase(i),
      actor: 'system',
      eventType: t.eventType,
      entityType: t.entityType,
      entityId: t.entityType === 'system' ? `seed-${i}` : `entity-${i}`,
      payload:
        t.eventType === 'seed'
          ? { index: i }
          : t.eventType === 'supplier_import'
            ? { success: 5, errors: 0 }
            : { brand, model },
    })
  }

  await systemJobRepo.create({
    ...withBase(0),
    jobType: 'supplier_import',
    status: 'success',
    lastRunAt: isoAt(0),
    lastSuccessAt: isoAt(0),
    lastError: '',
    retryCount: 0,
    maxRetries: 3,
  })
  await systemJobRepo.create({
    ...withBase(1),
    jobType: 'supplier_import',
    status: 'fail',
    lastRunAt: isoAt(-1),
    lastError: 'Connection timeout (seeded)',
    retryCount: 0,
    maxRetries: 3,
  })

  console.log('Seed complete')
}

seed().catch((error) => {
  console.error('Seed failed', error)
  process.exit(1)
})
