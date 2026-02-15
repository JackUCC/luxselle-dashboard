/**
 * In-process job runner: executes queued system jobs asynchronously.
 * Used by POST /api/jobs/:id/retry so the HTTP handler returns immediately
 * and the job runs in the background. For production at scale, replace with
 * a queue (e.g. Bull/BullMQ) or cron-triggered worker.
 */
import { SystemJobRepo } from '../repos/SystemJobRepo'
import { SupplierEmailSyncService } from './import/SupplierEmailSyncService'

const jobRepo = new SystemJobRepo()
const emailSyncService = new SupplierEmailSyncService()

export async function runJob(jobId: string): Promise<void> {
  const job = await jobRepo.getById(jobId)
  if (!job || job.status !== 'queued') {
    return
  }

  const now = new Date().toISOString()
  await jobRepo.set(jobId, {
    status: 'running',
    startedAt: now,
    updatedAt: now,
  })

  try {
    if (job.jobType === 'supplier_email_sync') {
      const result = await emailSyncService.sync()
      const completedAt = new Date().toISOString()
      const status = result.errors.length === 0 ? 'succeeded' : 'failed'
      await jobRepo.set(jobId, {
        status,
        completedAt,
        lastError: result.errors.length > 0 ? result.errors.slice(0, 5).join(' | ') : '',
        progress: {
          total: result.processedEmails + result.skippedAttachments,
          processed: result.processedEmails + result.skippedAttachments,
          created: result.importedItems,
          updated: 0,
          skipped: result.skippedAttachments,
          errors: result.errors.map((message, index) => ({ index, message })),
        },
        updatedAt: completedAt,
      })
      return
    }

    if (job.jobType === 'supplier_import') {
      await jobRepo.set(jobId, {
        status: 'failed',
        completedAt: now,
        lastError: 'Re-execution not supported: supplier_import requires original file upload. Re-run import from the Supplier Hub.',
        updatedAt: now,
      })
      return
    }

    await jobRepo.set(jobId, {
      status: 'failed',
      completedAt: now,
      lastError: `Re-execution not supported for job type: ${job.jobType}`,
      updatedAt: now,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await jobRepo.set(jobId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      lastError: message,
      updatedAt: new Date().toISOString(),
    })
  }
}
