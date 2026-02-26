import { describe, it, expect, vi, afterEach } from 'vitest'
import XLSX from 'xlsx'

const supplierItemCreateMock = vi.fn()
const jobCreateMock = vi.fn()
const activityCreateMock = vi.fn()
const settingsGetMock = vi.fn()

const loadService = async () => {
  vi.resetModules()
  supplierItemCreateMock.mockReset()
  jobCreateMock.mockReset()
  activityCreateMock.mockReset()
  settingsGetMock.mockReset()
  settingsGetMock.mockResolvedValue({ fxUsdToEur: 0.9 })

  vi.doMock('../../repos/SupplierItemRepo', () => ({
    SupplierItemRepo: class {
      create = supplierItemCreateMock
    },
  }))

  vi.doMock('../../repos/SystemJobRepo', () => ({
    SystemJobRepo: class {
      create = jobCreateMock
    },
  }))

  vi.doMock('../../repos/ActivityEventRepo', () => ({
    ActivityEventRepo: class {
      create = activityCreateMock
    },
  }))

  vi.doMock('../../repos/SettingsRepo', () => ({
    SettingsRepo: class {
      getSettings = settingsGetMock
    },
  }))

  // create() must resolve with an object (service reads created.id and created.imageUrl after create)
  supplierItemCreateMock.mockImplementation((item: Record<string, unknown>) =>
    Promise.resolve({ id: 'mock-id', imageUrl: '', ...item })
  )

  const module = await import('./SupplierImportService')
  return module.SupplierImportService
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SupplierImportService template import', () => {
  it('parses CSV preview headers and rows', async () => {
    const SupplierImportService = await loadService()
    const service = new SupplierImportService()
    const csv = [
      'Brand,SKU,Title,Price USD,STATUS',
      'Chanel,SKU-1,Classic Flap,100,UPLOADED',
    ].join('\n')

    const preview = service.previewImportFile(Buffer.from(csv), 'supplier.csv')
    expect(preview.fileType).toBe('csv')
    expect(preview.headers).toContain('Brand')
    expect(preview.rows).toHaveLength(1)
    expect(preview.rows[0]?.SKU).toBe('SKU-1')
  })

  it('parses XLSX preview headers and rows', async () => {
    const SupplierImportService = await loadService()
    const service = new SupplierImportService()
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.json_to_sheet([
      { Brand: 'Hermès', SKU: 'H-1', Title: 'Birkin', STATUS: 'WAITING' },
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    const preview = service.previewImportFile(buffer, 'supplier.xlsx')
    expect(preview.fileType).toBe('xlsx')
    expect(preview.headers).toContain('Brand')
    expect(preview.rows[0]?.Title).toBe('Birkin')
  })

  it('imports rows with supplier mapping template', async () => {
    const SupplierImportService = await loadService()
    const service = new SupplierImportService()
    const now = '2026-02-13T00:00:00.000Z'

    const result = await service.importWithTemplate(
      'supplier-1',
      [
        {
          Brand: 'Chanel',
          SKU: 'SKU-1',
          Title: 'Classic Flap',
          'Price USD': '100',
          STATUS: 'UPLOADED',
        },
      ],
      {
        columnMap: {
          brand: 'Brand',
          sku: 'SKU',
          title: 'Title',
          askPriceUsd: 'Price USD',
          availability: 'STATUS',
        },
        availabilityMap: {
          UPLOADED: 'uploaded',
        },
        defaultAvailability: 'uploaded',
        trimValues: true,
      },
      {
        now,
        recordJob: false,
        recordActivity: false,
      },
    )

    expect(result.success).toBe(1)
    expect(result.errors).toBe(0)
    expect(supplierItemCreateMock).toHaveBeenCalledTimes(1)
    const created = supplierItemCreateMock.mock.calls[0]?.[0]
    expect(created.supplierId).toBe('supplier-1')
    expect(created.brand).toBe('Chanel')
    expect(created.sku).toBe('SKU-1')
    expect(created.askPriceUsd).toBe(100)
    expect(created.askPriceEur).toBe(90)
    expect(created.availability).toBe('uploaded')
  })
})
