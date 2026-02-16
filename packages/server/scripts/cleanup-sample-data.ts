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

function parseOrg(argv: string[]): string {
  const orgArg = argv.find((arg) => arg.startsWith('--org='))
  return orgArg?.split('=')[1] || DEFAULT_ORG_ID
}

async function cleanupSampleData() {
  const orgId = parseOrg(process.argv.slice(2))

  const ids = [
    ['sample-smoke-job-1', new SystemJobRepo()],
    ['sample-smoke-activity-1', new ActivityEventRepo()],
    ['sample-smoke-sourcing-1', new SourcingRequestRepo()],
    ['sample-smoke-buying-list-1', new BuyingListItemRepo()],
    ['sample-smoke-transaction-1', new TransactionRepo()],
    ['sample-smoke-product-1', new ProductRepo()],
    ['sample-smoke-supplier-item-1', new SupplierItemRepo()],
    ['sample-smoke-supplier-1', new SupplierRepo()],
  ] as const

  for (const [id, repo] of ids) {
    await repo.remove(id, orgId)
  }

  console.log('Sample data cleanup complete', { orgId })
}

cleanupSampleData().catch((error) => {
  console.error('Sample data cleanup failed', error)
  process.exit(1)
})
