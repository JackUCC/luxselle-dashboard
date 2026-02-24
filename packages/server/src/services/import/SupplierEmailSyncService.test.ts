import { describe, it, expect, vi, afterEach } from 'vitest'

const listSuppliersMock = vi.fn()
const createJobMock = vi.fn()
const createActivityMock = vi.fn()
const parseImportFileMock = vi.fn()
const importWithTemplateMock = vi.fn()
const gmailListMock = vi.fn()
const gmailGetMock = vi.fn()
const gmailAttachmentGetMock = vi.fn()
const dedupeGetMock = vi.fn()
const dedupeSetMock = vi.fn()

const envMock = {
  SUPPLIER_EMAIL_ENABLED: true,
  GMAIL_CLIENT_ID: 'cid',
  GMAIL_CLIENT_SECRET: 'secret',
  GMAIL_REFRESH_TOKEN: 'refresh',
  GMAIL_USER: 'shared@luxselle.ie',
  SUPPLIER_EMAIL_DEFAULT_QUERY: 'has:attachment newer_than:30d',
  SUPPLIER_EMAIL_MAX_ATTACHMENT_MB: 10,
}

const loadService = async () => {
  vi.resetModules()
  listSuppliersMock.mockReset()
  createJobMock.mockReset()
  createActivityMock.mockReset()
  parseImportFileMock.mockReset()
  importWithTemplateMock.mockReset()
  gmailListMock.mockReset()
  gmailGetMock.mockReset()
  gmailAttachmentGetMock.mockReset()
  dedupeGetMock.mockReset()
  dedupeSetMock.mockReset()

  createJobMock.mockResolvedValue({ id: 'job-1' })
  createActivityMock.mockResolvedValue(undefined)
  parseImportFileMock.mockReturnValue({ fileType: 'csv', headers: ['Brand'], rows: [{ Brand: 'Chanel' }] })
  importWithTemplateMock.mockResolvedValue({ success: 2, errors: 0, total: 2, errorMessages: [] })

  vi.doMock('../../config/env', () => ({ env: envMock }))
  vi.doMock('../../config/firebase', () => ({
    db: {
      collection: () => ({
        doc: () => ({
          get: dedupeGetMock,
          set: dedupeSetMock,
        }),
      }),
    },
  }))
  vi.doMock('../../repos/SupplierRepo', () => ({
    SupplierRepo: class {
      list = listSuppliersMock
    },
  }))
  vi.doMock('../../repos/SystemJobRepo', () => ({
    SystemJobRepo: class {
      list = vi.fn().mockResolvedValue([])
      create = createJobMock
    },
  }))
  vi.doMock('../../repos/ActivityEventRepo', () => ({
    ActivityEventRepo: class {
      create = createActivityMock
    },
  }))
  vi.doMock('./SupplierImportService', () => ({
    SupplierImportService: class {
      parseImportFile = parseImportFileMock
      importWithTemplate = importWithTemplateMock
    },
  }))
  vi.doMock('googleapis', () => ({
    google: {
      auth: {
        OAuth2: class {
          constructor() {}
          setCredentials() {}
        },
      },
      gmail: () => ({
        users: {
          messages: {
            list: gmailListMock,
            get: gmailGetMock,
            attachments: {
              get: gmailAttachmentGetMock,
            },
          },
        },
      }),
    },
  }))

  const module = await import('./SupplierEmailSyncService')
  return module.SupplierEmailSyncService
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SupplierEmailSyncService', () => {
  it('imports attachment rows for matched supplier sender', async () => {
    const SupplierEmailSyncService = await loadService()

    listSuppliersMock.mockResolvedValueOnce([
      {
        id: 'supplier-1',
        sourceEmails: ['supplier@example.com'],
        email: '',
        importTemplate: {
          columnMap: { brand: 'Brand' },
          availabilityMap: {},
          defaultAvailability: 'uploaded',
          trimValues: true,
        },
      },
    ])

    gmailListMock.mockResolvedValueOnce({
      data: { messages: [{ id: 'm1' }] },
    })
    gmailGetMock.mockResolvedValueOnce({
      data: {
        payload: {
          headers: [{ name: 'From', value: 'Supplier <supplier@example.com>' }],
          parts: [
            {
              filename: 'feed.csv',
              body: { attachmentId: 'a1' },
              mimeType: 'text/csv',
            },
          ],
        },
      },
    })
    gmailAttachmentGetMock.mockResolvedValueOnce({
      data: { data: Buffer.from('Brand\nChanel', 'utf-8').toString('base64url') },
    })
    dedupeGetMock.mockResolvedValueOnce({ exists: false })
    dedupeSetMock.mockResolvedValueOnce(undefined)

    const service = new SupplierEmailSyncService()
    const result = await service.sync({ lookbackDays: 7 })

    expect(result.processedEmails).toBe(1)
    expect(result.importedItems).toBe(2)
    expect(result.skippedAttachments).toBe(0)
    expect(importWithTemplateMock).toHaveBeenCalledTimes(1)
    expect(createJobMock).toHaveBeenCalledTimes(1)
  })

  it('returns zero imports when sender email does not match any supplier', async () => {
    const SupplierEmailSyncService = await loadService()

    listSuppliersMock.mockResolvedValueOnce([
      {
        id: 'supplier-1',
        sourceEmails: ['known@example.com'],
        email: 'known@example.com',
        importTemplate: {
          columnMap: { brand: 'Brand' },
          availabilityMap: {},
          defaultAvailability: 'uploaded',
          trimValues: true,
        },
      },
    ])

    gmailListMock.mockResolvedValueOnce({
      data: { messages: [{ id: 'm2' }] },
    })
    gmailGetMock.mockResolvedValueOnce({
      data: {
        payload: {
          headers: [{ name: 'From', value: 'Unknown Sender <unknown@nobody.com>' }],
          parts: [
            {
              filename: 'feed.csv',
              body: { attachmentId: 'a2' },
              mimeType: 'text/csv',
            },
          ],
        },
      },
    })

    const service = new SupplierEmailSyncService()
    const result = await service.sync({ lookbackDays: 7 })

    expect(result.processedEmails).toBe(0)
    expect(result.importedItems).toBe(0)
    expect(result.skippedAttachments).toBe(0)
    expect(importWithTemplateMock).not.toHaveBeenCalled()
  })

  it('skips previously imported attachments by dedupe id', async () => {
    const SupplierEmailSyncService = await loadService()

    listSuppliersMock.mockResolvedValueOnce([
      {
        id: 'supplier-1',
        sourceEmails: ['supplier@example.com'],
        email: '',
        importTemplate: {
          columnMap: { brand: 'Brand' },
          availabilityMap: {},
          defaultAvailability: 'uploaded',
          trimValues: true,
        },
      },
    ])

    gmailListMock.mockResolvedValueOnce({
      data: { messages: [{ id: 'm1' }] },
    })
    gmailGetMock.mockResolvedValueOnce({
      data: {
        payload: {
          headers: [{ name: 'From', value: 'supplier@example.com' }],
          parts: [
            {
              filename: 'feed.csv',
              body: { attachmentId: 'a1' },
              mimeType: 'text/csv',
            },
          ],
        },
      },
    })
    dedupeGetMock.mockResolvedValueOnce({ exists: true })

    const service = new SupplierEmailSyncService()
    const result = await service.sync()

    expect(result.skippedAttachments).toBe(1)
    expect(importWithTemplateMock).not.toHaveBeenCalled()
  })
})
