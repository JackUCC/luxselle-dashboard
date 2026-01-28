import { parse } from 'csv-parse/sync'
import { SupplierItemRepo } from '../../repos/SupplierItemRepo'
import { SystemJobRepo } from '../../repos/SystemJobRepo'
import { ActivityEventRepo } from '../../repos/ActivityEventRepo'
import { SettingsRepo } from '../../repos/SettingsRepo'
import { usdToEur } from '../../lib/fx'
import { DEFAULT_ORG_ID, SupplierItemSchema } from '@shared/schemas'

export interface ImportResult {
  success: number
  errors: number
  total: number
  errorMessages: string[]
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

  async importBrandStreetTokyoCSV(
    supplierId: string,
    csvContent: string
  ): Promise<ImportResult> {
    const now = new Date().toISOString()
    const result: ImportResult = {
      success: 0,
      errors: 0,
      total: 0,
      errorMessages: [],
    }

    try {
      // Get FX rate from settings
      const settings = await this.settingsRepo.getSettings()
      const fxUsdToEur = settings?.fxUsdToEur ?? 0.92

      // Parse CSV
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      })

      result.total = records.length

      // Process each row
      for (const row of records) {
        try {
          const item = this.mapBrandStreetTokyoRow(
            supplierId,
            row,
            fxUsdToEur,
            now
          )
          await this.supplierItemRepo.create(item)
          result.success++
        } catch (error) {
          result.errors++
          const message =
            error instanceof Error ? error.message : 'Unknown error'
          result.errorMessages.push(
            `Row ${result.success + result.errors}: ${message}`
          )
        }
      }

      // Create system job record
      await this.systemJobRepo.create({
        organisationId: DEFAULT_ORG_ID,
        createdAt: now,
        updatedAt: now,
        jobType: 'supplier_import',
        status: result.errors === 0 ? 'success' : 'fail',
        lastRunAt: now,
        lastSuccessAt: result.errors === 0 ? now : undefined,
        lastError:
          result.errors > 0
            ? `${result.errors} errors occurred`
            : '',
      })

      // Create activity event
      await this.activityRepo.create({
        organisationId: DEFAULT_ORG_ID,
        createdAt: now,
        updatedAt: now,
        actor: 'system',
        eventType: 'supplier_import',
        entityType: 'supplier',
        entityId: supplierId,
        payload: {
          total: result.total,
          success: result.success,
          errors: result.errors,
        },
      })

      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed'
      throw new Error(`CSV import failed: ${message}`)
    }
  }

  private mapBrandStreetTokyoRow(
    supplierId: string,
    row: any,
    fxUsdToEur: number,
    now: string
  ) {
    // Map Brand Street Tokyo columns to our schema
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

    // Find image URL (look for columns with 'world-switch' in them)
    let imageUrl = 'https://placehold.co/300x300.png'
    for (const key of Object.keys(row)) {
      const value = String(row[key] || '')
      if (value.includes('world-switch')) {
        imageUrl = value
        break
      }
    }

    // Find Google Drive folder URL
    let sourceUrl = ''
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
