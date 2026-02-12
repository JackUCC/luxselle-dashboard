/**
 * Invoices collection: CRUD and getNextInvoiceNumber for accounting.
 * @see docs/CODE_REFERENCE.md
 */
import { DEFAULT_ORG_ID, InvoiceSchema } from '@shared/schemas'
import type { Invoice } from '@shared/schemas'
import { BaseRepo } from './BaseRepo'

export class InvoiceRepo extends BaseRepo<Invoice> {
  constructor() {
    super('invoices', InvoiceSchema)
  }

  /**
   * Next invoice number for org: INV-0001, INV-0002, ... (max existing + 1).
   */
  async getNextInvoiceNumber(orgId: string = DEFAULT_ORG_ID): Promise<string> {
    const list = await this.list(orgId)
    const numbers = list
      .map((inv) => {
        const match = inv.invoiceNumber.match(/^INV-(\d+)$/)
        return match ? parseInt(match[1], 10) : 0
      })
      .filter((n) => !Number.isNaN(n))
    const next = numbers.length === 0 ? 1 : Math.max(...numbers) + 1
    return `INV-${String(next).padStart(4, '0')}`
  }
}
