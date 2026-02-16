import { DEFAULT_ORG_ID } from '@shared/schemas'
import {
  ActivityEventRepo,
  BuyingListItemRepo,
  ProductRepo,
  SourcingRequestRepo,
  SupplierItemRepo,
  SupplierRepo,
  SystemJobRepo,
  TransactionRepo,
} from '../src/repos'
import { env } from '../src/config/env'

interface LoadOptions {
  orgId: string
  allowProduction: boolean
}

function parseArgs(argv: string[]): LoadOptions {
  const orgArg = argv.find((arg) => arg.startsWith('--org='))
  return {
    orgId: orgArg?.split('=')[1] || DEFAULT_ORG_ID,
    allowProduction: argv.includes('--allow-production-seed'),
  }
}

function assertSafety(options: LoadOptions) {
  const isProduction = env.NODE_ENV === 'production' || !env.FIREBASE_USE_EMULATOR
  if (isProduction && !options.allowProduction) {
    throw new Error('Refusing to load sample data in production/non-emulator mode without --allow-production-seed')
  }
}

async function loadSampleData() {
  const options = parseArgs(process.argv.slice(2))
  assertSafety(options)

  const now = new Date().toISOString()
  const runId = `sample-${Date.now()}`
  const tag = 'sample-smoke'

  console.log('Loading sample data', {
    orgId: options.orgId,
    firebaseProject: env.FIREBASE_PROJECT_ID,
    emulator: env.FIREBASE_USE_EMULATOR,
    runId,
  })

  const supplierRepo = new SupplierRepo()
  const supplierItemRepo = new SupplierItemRepo()
  const productRepo = new ProductRepo()
  const transactionRepo = new TransactionRepo()
  const buyingListRepo = new BuyingListItemRepo()
  const sourcingRepo = new SourcingRequestRepo()
  const activityRepo = new ActivityEventRepo()
  const systemJobRepo = new SystemJobRepo()

  const supplier = await supplierRepo.set(
    'sample-smoke-supplier-1',
    {
      organisationId: options.orgId,
      createdAt: now,
      updatedAt: now,
      name: 'Sample Smoke Supplier',
      email: 'sample-smoke-supplier@luxselle.local',
      contactName: 'Smoke Test',
      status: 'active',
      region: 'EU',
      itemCount: 1,
      sourceEmails: ['sample-smoke-supplier@luxselle.local'],
      notes: `${tag}:${runId}`,
    },
    options.orgId
  )

  await supplierItemRepo.set(
    'sample-smoke-supplier-item-1',
    {
      organisationId: options.orgId,
      createdAt: now,
      updatedAt: now,
      supplierId: supplier.id,
      externalId: 'SMOKE-ITEM-001',
      title: 'Chanel Classic Flap (Sample)',
      brand: 'Chanel',
      sku: 'SMOKE-001',
      conditionRank: 'excellent',
      askPriceUsd: 1000,
      askPriceEur: 920,
      sellingPriceUsd: 1450,
      sellingPriceEur: 1334,
      availability: 'uploaded',
      imageUrl: 'https://placehold.co/300x300.png',
      sourceUrl: 'https://example.com/sample-smoke-item',
      rawPayload: { source: tag, runId },
      lastSeenAt: now,
    },
    options.orgId
  )

  const product = await productRepo.set(
    'sample-smoke-product-1',
    {
      organisationId: options.orgId,
      createdAt: now,
      updatedAt: now,
      brand: 'Chanel',
      model: 'Classic Flap',
      category: 'handbag',
      condition: 'excellent',
      colour: 'black',
      costPriceEur: 1200,
      sellPriceEur: 1850,
      currency: 'EUR',
      status: 'in_stock',
      quantity: 1,
      imageUrls: ['https://placehold.co/600x600.png'],
      images: [],
      notes: `${tag}:${runId}`,
    },
    options.orgId
  )

  await transactionRepo.set(
    'sample-smoke-transaction-1',
    {
      organisationId: options.orgId,
      createdAt: now,
      updatedAt: now,
      type: 'purchase',
      productId: product.id,
      amountEur: 1200,
      occurredAt: now,
      notes: `${tag}:${runId}`,
    },
    options.orgId
  )

  await buyingListRepo.set(
    'sample-smoke-buying-list-1',
    {
      organisationId: options.orgId,
      createdAt: now,
      updatedAt: now,
      sourceType: 'manual',
      brand: 'Hermès',
      model: 'Birkin',
      category: 'handbag',
      condition: 'good',
      colour: 'gold',
      targetBuyPriceEur: 8000,
      status: 'pending',
      notes: `${tag}:${runId}`,
    },
    options.orgId
  )

  await sourcingRepo.set(
    'sample-smoke-sourcing-1',
    {
      organisationId: options.orgId,
      createdAt: now,
      updatedAt: now,
      customerName: 'Smoke Test Customer',
      queryText: 'Louis Vuitton Neverfull',
      brand: 'Louis Vuitton',
      budget: 1600,
      priority: 'medium',
      status: 'open',
      notes: `${tag}:${runId}`,
    },
    options.orgId
  )

  await activityRepo.set(
    'sample-smoke-activity-1',
    {
      organisationId: options.orgId,
      createdAt: now,
      updatedAt: now,
      actor: 'system',
      eventType: 'sample_data_loaded',
      entityType: 'system',
      entityId: runId,
      payload: { source: tag, orgId: options.orgId },
    },
    options.orgId
  )

  await systemJobRepo.set(
    'sample-smoke-job-1',
    {
      organisationId: options.orgId,
      createdAt: now,
      updatedAt: now,
      jobType: 'sample_data_load',
      status: 'succeeded',
      queuedAt: now,
      startedAt: now,
      completedAt: now,
      retryCount: 0,
      maxRetries: 0,
      output: { source: tag, runId },
      lastError: '',
    },
    options.orgId
  )

  console.log('Sample data load complete', { orgId: options.orgId, runId })
}

loadSampleData().catch((error) => {
  console.error('Sample data load failed', error)
  process.exit(1)
})
