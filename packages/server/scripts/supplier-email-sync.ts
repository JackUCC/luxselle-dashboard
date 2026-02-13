import { SupplierEmailSyncService } from '../src/services/import/SupplierEmailSyncService'

async function run() {
  const service = new SupplierEmailSyncService()
  const result = await service.sync()
  console.log(
    JSON.stringify(
      {
        ok: true,
        ...result,
      },
      null,
      2,
    ),
  )
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(JSON.stringify({ ok: false, error: message }))
  process.exit(1)
})
