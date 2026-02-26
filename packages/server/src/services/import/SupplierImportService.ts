/**
 * Parse supplier CSV (e.g. Brand Street Tokyo), map columns, validate; create supplier items. Uses fx (usdToEur) and settings for rate.
 * @see docs/CODE_REFERENCE.md
 * References: csv-parse, fx.ts, SettingsRepo, SupplierItemSchema
 */
import { parse } from 'csv-parse/sync'
import XLSX from 'xlsx'
import { SupplierItemRepo } from '../../repos/SupplierItemRepo'
import { SystemJobRepo } from '../../repos/SystemJobRepo'
import { ActivityEventRepo } from '../../repos/ActivityEventRepo'
import { SettingsRepo } from '../../repos/SettingsRepo'
import { usdToEur } from '../../lib/fx'
import {
  DEFAULT_ORG_ID,
  SupplierItemSchema,
  type SupplierImportTemplate,
} from '@shared/schemas'
import { indexSupplierItemImage } from '../visualSearch/VisualSearchPipeline'

export interface ImportResult {
  success: number
  errors: number
  total: number
  errorMessages: string[]
}

export interface ParsedImportFile {
  headers: string[]
  rows: Record<string, string>[]
  fileType: 'csv' | 'xlsx'
  sheetNames?: string[]
}

export interface ImportWithTemplateOptions {
  now?: string
  jobType?: string
  recordJob?: boolean
  recordActivity?: boolean
}

export class SupplierImportService {
  private supplierItemRepo: SupplierItemRepo
  private systemJobRepo: SystemJobRepo
  private activityRepo: ActivityEventRepo
  private settingsRepo: SettingsRepo

  constructor() {
    this.supplierItemRepo = new SupplierItemRepo()
    this.systemJobRepo = new SystemJobRepo()
    this.activityRepo = new ActivityEventRepo()
    this.settingsRepo = new SettingsRepo()
  }

  parseImportFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType?: string,
  ): ParsedImportFile {
    const lower = fileName.toLowerCase()
    const isXlsx =
      lower.endsWith('.xlsx') ||
      lower.endsWith('.xls') ||
      (mimeType?.includes('sheet') ?? false)

    if (!isXlsx) {
      const rows = this.parseCsvRows(fileBuffer.toString('utf-8'))
      const headers = rows.length > 0 ? Object.keys(rows[0]) : []
      return {
        fileType: 'csv',
        headers,
        rows,
      }
    }

    const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
    const [firstSheetName] = workbook.SheetNames
    if (!firstSheetName) {
      throw new Error('Workbook is empty or contains no parseable sheets')
    }

    const sheet = workbook.Sheets[firstSheetName]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    })
    const rows = rawRows.map((row) => this.normaliseRow(row))

    let headers = rows.length > 0 ? Object.keys(rows[0]) : []
    if (headers.length === 0) {
      const matrix = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, {
        header: 1,
        blankrows: false,
      })
      const firstRow = matrix[0] ?? []
      headers = firstRow.map((value) => String(value).trim()).filter(Boolean)
    }

    return {
      fileType: 'xlsx',
      headers,
      rows,
      sheetNames: workbook.SheetNames,
    }
  }

  previewImportFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType?: string,
    sampleSize = 10,
  ): ParsedImportFile {
    const parsed = this.parseImportFile(fileBuffer, fileName, mimeType)
    return {
      ...parsed,
      rows: parsed.rows.slice(0, sampleSize),
    }
  }

  async importBrandStreetTokyoCSV(
    supplierId: string,
    csvContent: string,
  ): Promise<ImportResult> {
    const now = new Date().toISOString()
    const result: ImportResult = {
      success: 0,
      errors: 0,
      total: 0,
      errorMessages: [],
    }

    try {
      const settings = await this.settingsRepo.getSettings()
      const fxUsdToEur = settings?.fxUsdToEur ?? 0.92

      const records = this.parseCsvRows(csvContent)

      result.total = records.length

      for (const row of records) {
        try {
          const item = this.mapBrandStreetTokyoRow(
            supplierId,
            row,
            fxUsdToEur,
            now,
          )
          await this.supplierItemRepo.create(item)
          result.success++
        } catch (error) {
          result.errors++
          const message =
            error instanceof Error ? error.message : 'Unknown error'
          result.errorMessages.push(
            `Row ${result.success + result.errors}: ${message}`,
          )
        }
      }

      await this.recordImportOutcome(supplierId, result, now, 'supplier_import')
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed'
      throw new Error(`CSV import failed: ${message}`)
    }
  }

  async importWithTemplate(
    supplierId: string,
    rows: Record<string, string>[],
    template: SupplierImportTemplate,
    options: ImportWithTemplateOptions = {},
  ): Promise<ImportResult> {
    const now = options.now ?? new Date().toISOString()
    const result: ImportResult = {
      success: 0,
      errors: 0,
      total: rows.length,
      errorMessages: [],
    }

    try {
      const settings = await this.settingsRepo.getSettings()
      const fxUsdToEur = settings?.fxUsdToEur ?? 0.92

      for (const [index, row] of rows.entries()) {
        try {
          const item = this.mapTemplateRow(
            supplierId,
            row,
            template,
            fxUsdToEur,
            now,
            index,
          )
          const created = await this.supplierItemRepo.create(item)
          result.success++
          if (created.imageUrl) {
            indexSupplierItemImage(created.id, created.imageUrl).catch(() => {})
          }
        } catch (error) {
          result.errors++
          const message = error instanceof Error ? error.message : 'Unknown error'
          result.errorMessages.push(`Row ${index + 1}: ${message}`)
        }
      }

      if (options.recordJob !== false || options.recordActivity !== false) {
        await this.recordImportOutcome(
          supplierId,
          result,
          now,
          options.jobType ?? 'supplier_import',
          {
            recordJob: options.recordJob !== false,
            recordActivity: options.recordActivity !== false,
          },
        )
      }
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Mapped import failed'
      throw new Error(`Mapped import failed: ${message}`)
    }
  }

  private parseCsvRows(csvContent: string): Record<string, string>[] {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as Array<Record<string, unknown>>

    return records.map((row) => this.normaliseRow(row))
  }

  private normaliseRow(row: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {}
    for (const key of Object.keys(row)) {
      result[key] = String(row[key] ?? '')
    }
    return result
  }

  private readTemplateValue(
    row: Record<string, string>,
    template: SupplierImportTemplate,
    field: keyof SupplierImportTemplate['columnMap'],
  ): string {
    const column = template.columnMap[field]
    if (!column) return ''
    const raw = String(row[column] ?? '')
    return template.trimValues ? raw.trim() : raw
  }

  private parseAmount(raw: string): number {
    const cleaned = raw.replace(/[^0-9.-]/g, '')
    const parsed = parseFloat(cleaned)
    return Number.isFinite(parsed) ? parsed : 0
  }

  private normaliseAvailability(
    rawValue: string,
    template: SupplierImportTemplate,
  ): 'uploaded' | 'sold' | 'waiting' {
    const normalizedRaw = rawValue.trim()
    if (!normalizedRaw) {
      return template.defaultAvailability
    }

    const directMap =
      template.availabilityMap[normalizedRaw] ??
      template.availabilityMap[normalizedRaw.toUpperCase()] ??
      template.availabilityMap[normalizedRaw.toLowerCase()]

    if (directMap) return directMap

    const upper = normalizedRaw.toUpperCase()
    if (upper === 'UPLOADED') return 'uploaded'
    if (upper === 'SOLD') return 'sold'
    if (upper === 'WAITING') return 'waiting'

    return template.defaultAvailability
  }

  private toValidUrl(value: string, fallback: string): string {
    try {
      if (!value) return fallback
      const parsed = new URL(value)
      return parsed.toString()
    } catch {
      return fallback
    }
  }

  private mapTemplateRow(
    supplierId: string,
    row: Record<string, string>,
    template: SupplierImportTemplate,
    fxUsdToEur: number,
    now: string,
    index: number,
  ) {
    const brand = this.readTemplateValue(row, template, 'brand')
    const sku = this.readTemplateValue(row, template, 'sku')
    const externalId =
      this.readTemplateValue(row, template, 'externalId') ||
      sku ||
      `${supplierId}-${Date.now()}-${index}`
    const titleCandidate = this.readTemplateValue(row, template, 'title')
    const title = titleCandidate || `${brand} ${sku}`.trim() || `Supplier Item ${index + 1}`
    const conditionRank = this.readTemplateValue(row, template, 'conditionRank')

    const askPriceUsdRaw = this.parseAmount(this.readTemplateValue(row, template, 'askPriceUsd'))
    const askPriceEurRaw = this.parseAmount(this.readTemplateValue(row, template, 'askPriceEur'))
    const askPriceUsd =
      askPriceUsdRaw > 0 ? askPriceUsdRaw : askPriceEurRaw > 0 ? askPriceEurRaw / fxUsdToEur : 0
    const askPriceEur =
      askPriceEurRaw > 0 ? askPriceEurRaw : askPriceUsd > 0 ? usdToEur(askPriceUsd, fxUsdToEur) : 0

    const sellingPriceUsdRaw = this.parseAmount(this.readTemplateValue(row, template, 'sellingPriceUsd'))
    const sellingPriceEurRaw = this.parseAmount(this.readTemplateValue(row, template, 'sellingPriceEur'))
    const sellingPriceUsd =
      sellingPriceUsdRaw > 0
        ? sellingPriceUsdRaw
        : sellingPriceEurRaw > 0
        ? sellingPriceEurRaw / fxUsdToEur
        : undefined
    const sellingPriceEur =
      sellingPriceEurRaw > 0
        ? sellingPriceEurRaw
        : sellingPriceUsd && sellingPriceUsd > 0
        ? usdToEur(sellingPriceUsd, fxUsdToEur)
        : undefined

    const availability = this.normaliseAvailability(
      this.readTemplateValue(row, template, 'availability'),
      template,
    )
    const imageUrl = this.toValidUrl(
      this.readTemplateValue(row, template, 'imageUrl'),
      'https://placehold.co/300x300.png',
    )
    const sourceUrl = this.toValidUrl(
      this.readTemplateValue(row, template, 'sourceUrl'),
      'https://example.com/source',
    )

    return SupplierItemSchema.parse({
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      supplierId,
      externalId,
      title,
      brand,
      sku,
      conditionRank,
      askPriceUsd: Number(askPriceUsd.toFixed(2)),
      askPriceEur: Number(askPriceEur.toFixed(2)),
      sellingPriceUsd: sellingPriceUsd ? Number(sellingPriceUsd.toFixed(2)) : undefined,
      sellingPriceEur: sellingPriceEur ? Number(sellingPriceEur.toFixed(2)) : undefined,
      availability,
      imageUrl,
      sourceUrl,
      rawPayload: row,
      lastSeenAt: now,
    })
  }

  private async recordImportOutcome(
    supplierId: string,
    result: ImportResult,
    now: string,
    jobType: string,
    options: { recordJob: boolean; recordActivity: boolean } = {
      recordJob: true,
      recordActivity: true,
    },
  ) {
    if (options.recordJob) {
      await this.systemJobRepo.create({
        organisationId: DEFAULT_ORG_ID,
        createdAt: now,
        updatedAt: now,
        jobType,
        status: result.errors === 0 ? 'success' : 'fail',
        lastRunAt: now,
        lastSuccessAt: result.errors === 0 ? now : undefined,
        lastError: result.errors > 0 ? `${result.errors} errors occurred` : '',
        retryCount: 0,
        maxRetries: 3,
        progress: {
          total: result.total,
          processed: result.total,
          created: result.success,
          updated: 0,
          skipped: 0,
          errors: result.errorMessages.map((msg, idx) => ({ index: idx, message: msg })),
        },
      })
    }

    if (options.recordActivity) {
      await this.activityRepo.create({
        organisationId: DEFAULT_ORG_ID,
        createdAt: now,
        updatedAt: now,
        actor: 'system',
        eventType: 'supplier_import',
        entityType: 'supplier',
        entityId: supplierId,
        payload: {
          jobType,
          total: result.total,
          success: result.success,
          errors: result.errors,
        },
      })
    }
  }

  private mapBrandStreetTokyoRow(
    supplierId: string,
    row: Record<string, string>,
    fxUsdToEur: number,
    now: string,
  ) {
    const status = String(row.STATUS || '').toUpperCase()
    const availability =
      status === 'UPLOADED'
        ? 'uploaded'
        : status === 'SOLD'
        ? 'sold'
        : status === 'WAITING'
        ? 'waiting'
        : 'uploaded'

    const brand = String(row.Brand || '')
    const sku = String(row.SKU || '')
    const title = String(row.Title || `${brand} ${row.Model || ''}`)
    const conditionRank = String(row.Rank || '')

    // Parse prices
    const forYouUsdStr = String(row['For you in USD'] || '0')
    const askPriceUsd = parseFloat(forYouUsdStr.replace(/[^0-9.]/g, '')) || 0
    const askPriceEur = usdToEur(askPriceUsd, fxUsdToEur)

    const sellingPriceStr = String(row['Selling Price'] || '0')
    const sellingPriceUsd =
      parseFloat(sellingPriceStr.replace(/[^0-9.]/g, '')) || 0
    const sellingPriceEur =
      sellingPriceUsd > 0 ? usdToEur(sellingPriceUsd, fxUsdToEur) : undefined

    let imageUrl = 'https://placehold.co/300x300.png'
    for (const key of Object.keys(row)) {
      const value = String(row[key] || '')
      if (value.includes('world-switch')) {
        imageUrl = value
        break
      }
    }

    let sourceUrl = 'https://example.com/source'
    for (const key of Object.keys(row)) {
      const value = String(row[key] || '')
      if (value.includes('drive.google.com')) {
        sourceUrl = value
        break
      }
    }

    return SupplierItemSchema.parse({
      organisationId: DEFAULT_ORG_ID,
      createdAt: now,
      updatedAt: now,
      supplierId,
      externalId: sku || `BST-${Date.now()}`,
      title,
      brand,
      sku,
      conditionRank,
      askPriceUsd,
      askPriceEur,
      sellingPriceUsd: sellingPriceUsd > 0 ? sellingPriceUsd : undefined,
      sellingPriceEur,
      availability,
      imageUrl,
      sourceUrl,
      rawPayload: row,
      lastSeenAt: now,
    })
  }
}
