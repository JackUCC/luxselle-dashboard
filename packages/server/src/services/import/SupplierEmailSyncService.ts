/**
 * Supplier email sync service: poll shared Gmail inbox, parse CSV/XLSX attachments,
 * apply supplier templates, and import supplier items with dedupe.
 */
import { createHash } from 'node:crypto'
import { google } from 'googleapis'
import { env } from '../../config/env'
import { db } from '../../config/firebase'
import { SupplierRepo } from '../../repos/SupplierRepo'
import { SystemJobRepo } from '../../repos/SystemJobRepo'
import { ActivityEventRepo } from '../../repos/ActivityEventRepo'
import { SupplierImportService } from './SupplierImportService'
import { DEFAULT_ORG_ID, type Supplier } from '@shared/schemas'

interface SupplierMatch extends Supplier {
  id: string
}

export interface SupplierEmailStatus {
  enabled: boolean
  connected: boolean
  mailbox: string
  lastSyncAt: string | null
  lastSyncStatus: string | null
  lastError: string
}

export interface SupplierEmailSyncResult {
  jobId: string
  processedEmails: number
  importedItems: number
  skippedAttachments: number
  errors: string[]
}

interface ParsedAttachmentPart {
  filename: string
  attachmentId: string
  mimeType?: string
}

export class SupplierEmailSyncService {
  private supplierRepo: SupplierRepo
  private jobRepo: SystemJobRepo
  private activityRepo: ActivityEventRepo
  private importService: SupplierImportService

  constructor() {
    this.supplierRepo = new SupplierRepo()
    this.jobRepo = new SystemJobRepo()
    this.activityRepo = new ActivityEventRepo()
    this.importService = new SupplierImportService()
  }

  async getStatus(): Promise<SupplierEmailStatus> {
    const jobs = await this.jobRepo.list()
    const lastSync = jobs
      .filter((job) => job.jobType === 'supplier_email_sync')
      .sort((a, b) => (b.lastRunAt || b.createdAt).localeCompare(a.lastRunAt || a.createdAt))[0]

    return {
      enabled: env.SUPPLIER_EMAIL_ENABLED,
      connected: this.hasGmailCredentials(),
      mailbox: env.GMAIL_USER ?? '',
      lastSyncAt: lastSync?.lastRunAt ?? null,
      lastSyncStatus: lastSync?.status ?? null,
      lastError: lastSync?.lastError ?? '',
    }
  }

  async sync(options: { lookbackDays?: number } = {}): Promise<SupplierEmailSyncResult> {
    if (!env.SUPPLIER_EMAIL_ENABLED) {
      throw new Error('Supplier email sync is disabled')
    }
    if (!this.hasGmailCredentials()) {
      throw new Error('Missing Gmail credentials')
    }

    const startedAt = new Date().toISOString()
    const oauth2Client = new google.auth.OAuth2(
      env.GMAIL_CLIENT_ID,
      env.GMAIL_CLIENT_SECRET,
    )
    oauth2Client.setCredentials({
      refresh_token: env.GMAIL_REFRESH_TOKEN,
    })
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const mailbox = env.GMAIL_USER || 'me'
    const suppliers = await this.supplierRepo.list()

    const query = options.lookbackDays
      ? `has:attachment newer_than:${options.lookbackDays}d`
      : env.SUPPLIER_EMAIL_DEFAULT_QUERY

    const listRes = await gmail.users.messages.list({
      userId: mailbox,
      q: query,
      maxResults: 100,
    })
    const messageRefs = listRes.data.messages ?? []

    let processedEmails = 0
    let importedItems = 0
    let skippedAttachments = 0
    const errors: string[] = []

    for (const messageRef of messageRefs) {
      if (!messageRef.id) continue

      try {
        const messageRes = await gmail.users.messages.get({
          userId: mailbox,
          id: messageRef.id,
          format: 'full',
        })
        const message = messageRes.data
        const sender = this.extractSenderEmail(message.payload?.headers)
        const supplier = this.matchSupplier(sender, suppliers)
        if (!supplier || !supplier.importTemplate) {
          continue
        }

        processedEmails++

        const attachments = this.collectAttachmentParts(message.payload)
        if (attachments.length === 0) continue

        for (const attachment of attachments) {
          const dedupeId = this.makeDedupeId(messageRef.id, attachment.attachmentId)
          const already = await db.collection('supplier_email_imports').doc(dedupeId).get()
          if (already.exists) {
            skippedAttachments++
            continue
          }

          const attachmentRes = await gmail.users.messages.attachments.get({
            userId: mailbox,
            messageId: messageRef.id,
            id: attachment.attachmentId,
          })
          const attachmentData = attachmentRes.data.data
          if (!attachmentData) {
            skippedAttachments++
            continue
          }

          const buffer = this.decodeBase64UrlToBuffer(attachmentData)
          const maxBytes = env.SUPPLIER_EMAIL_MAX_ATTACHMENT_MB * 1024 * 1024
          if (buffer.length > maxBytes) {
            skippedAttachments++
            errors.push(
              `${attachment.filename}: skipped (exceeds ${env.SUPPLIER_EMAIL_MAX_ATTACHMENT_MB}MB)`,
            )
            continue
          }

          const parsed = this.importService.parseImportFile(
            buffer,
            attachment.filename,
            attachment.mimeType,
          )

          const imported = await this.importService.importWithTemplate(
            supplier.id,
            parsed.rows,
            supplier.importTemplate,
            {
              recordActivity: false,
              recordJob: false,
              now: startedAt,
            },
          )

          importedItems += imported.success
          if (imported.errorMessages.length > 0) {
            errors.push(...imported.errorMessages.map((msg) => `${attachment.filename}: ${msg}`))
          }

          await db.collection('supplier_email_imports').doc(dedupeId).set({
            organisationId: DEFAULT_ORG_ID,
            createdAt: startedAt,
            updatedAt: startedAt,
            messageId: messageRef.id,
            attachmentId: attachment.attachmentId,
            supplierId: supplier.id,
            senderEmail: sender,
            fileName: attachment.filename,
            importedCount: imported.success,
          })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown email sync error'
        errors.push(`message ${messageRef.id}: ${message}`)
      }
    }

    const finishedAt = new Date().toISOString()
    const job = await this.jobRepo.create({
      organisationId: DEFAULT_ORG_ID,
      createdAt: finishedAt,
      updatedAt: finishedAt,
      jobType: 'supplier_email_sync',
      status: errors.length === 0 ? 'success' : 'fail',
      lastRunAt: finishedAt,
      lastSuccessAt: errors.length === 0 ? finishedAt : undefined,
      lastError: errors.length > 0 ? errors.slice(0, 5).join(' | ') : '',
      retryCount: 0,
      maxRetries: 3,
      progress: {
        total: messageRefs.length,
        processed: processedEmails,
        created: importedItems,
        updated: 0,
        skipped: skippedAttachments,
        errors: errors.map((message, index) => ({ index, message })),
      },
    })

    await this.activityRepo.create({
      organisationId: DEFAULT_ORG_ID,
      createdAt: finishedAt,
      updatedAt: finishedAt,
      actor: 'system',
      eventType: 'supplier_import',
      entityType: 'supplier',
      entityId: 'email-sync',
      payload: {
        processedEmails,
        importedItems,
        skippedAttachments,
        errorCount: errors.length,
      },
    })

    return {
      jobId: job.id,
      processedEmails,
      importedItems,
      skippedAttachments,
      errors,
    }
  }

  private hasGmailCredentials() {
    return Boolean(
      env.GMAIL_CLIENT_ID &&
        env.GMAIL_CLIENT_SECRET &&
        env.GMAIL_REFRESH_TOKEN &&
        env.GMAIL_USER,
    )
  }

  private extractSenderEmail(headers?: Array<{ name?: string | null; value?: string | null }>) {
    const fromHeader = headers?.find((header) => header.name?.toLowerCase() === 'from')?.value ?? ''
    const angleMatch = fromHeader.match(/<([^>]+)>/)
    const candidate = angleMatch ? angleMatch[1] : fromHeader
    return candidate.trim().toLowerCase()
  }

  private matchSupplier(senderEmail: string, suppliers: SupplierMatch[]): SupplierMatch | null {
    if (!senderEmail) return null

    const byAlias = suppliers.find((supplier) =>
      (supplier.sourceEmails ?? []).some((value) => value.trim().toLowerCase() === senderEmail),
    )
    if (byAlias) return byAlias

    return (
      suppliers.find((supplier) => {
        const email = supplier.email?.trim().toLowerCase()
        return email === senderEmail
      }) ?? null
    )
  }

  private collectAttachmentParts(
    payload?: { parts?: any[]; filename?: string | null; body?: { attachmentId?: string | null }; mimeType?: string | null },
  ): ParsedAttachmentPart[] {
    if (!payload) return []
    const output: ParsedAttachmentPart[] = []

    const walk = (part?: { parts?: any[]; filename?: string | null; body?: { attachmentId?: string | null }; mimeType?: string | null }) => {
      if (!part) return
      const filename = part.filename ?? ''
      const attachmentId = part.body?.attachmentId ?? ''
      const lower = filename.toLowerCase()
      if (
        filename &&
        attachmentId &&
        (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls'))
      ) {
        output.push({
          filename,
          attachmentId,
          mimeType: part.mimeType ?? undefined,
        })
      }
      for (const nested of part.parts ?? []) {
        walk(nested)
      }
    }

    walk(payload)
    return output
  }

  private decodeBase64UrlToBuffer(input: string): Buffer {
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(base64, 'base64')
  }

  private makeDedupeId(messageId: string, attachmentId: string) {
    return createHash('sha256').update(`${messageId}:${attachmentId}`).digest('hex')
  }
}
