/**
 * Parse Luxselle inventory PDF text into product rows.
 * Used by POST /api/products/import-pdf and by import-inventory-from-pdf script.
 */
export interface LuxsellePdfRow {
  brand: string
  title: string
  sku: string
  costPriceEur: number
  customsEur: number
  vatEur: number
  sellPriceEur: number
}

export function parseLuxsellePdfText(text: string): LuxsellePdfRow[] {
  const rows: LuxsellePdfRow[] = []
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  function parseEurAmount(s: string): number {
    const n = parseFloat(s.replace(/[,\s]/g, ''))
    return Number.isNaN(n) ? 0 : n
  }

  function brandFromTitle(title: string): string {
    const t = title.trim()
    if (t.startsWith('Christian Dior') || t.startsWith('Christian ')) return 'Christian Dior'
    if (t.startsWith('BOTTEGA VENETA') || t.startsWith('BOTTEGAVENETA')) return 'Bottega Veneta'
    const first = t.split(/\s+/)[0] ?? ''
    if (!first) return 'Unknown'
    return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase()
  }

  for (const line of lines) {
    if (line.startsWith('▼') || line.startsWith('Invoice No.') || line === 'LUXSELLE INVENTORY' || line.includes('--')) continue
    const euroParts = line.split('€')
    if (euroParts.length < 6) continue
    const beforePrices = euroParts[0].trim()
    const match = beforePrices.match(/^\d+\s+[A-Za-z]+\s+\d{1,2},\s+\d{4}\s+(\S+)\s+(.+)$/)
    if (!match) continue
    const sku = match[1]
    const title = match[2].trim()
    if (!title || title.length < 2) continue

    const prices = euroParts.slice(1).map((s) => parseEurAmount(s)).filter((n) => n > 0)
    const invoicePrice = prices[0] ?? 0
    const customs = prices[1] ?? 0
    const vat10 = prices[4] ?? 0
    const selling10 = prices[5] ?? 0

    rows.push({
      brand: brandFromTitle(title),
      title,
      sku,
      costPriceEur: invoicePrice,
      customsEur: customs,
      vatEur: vat10,
      sellPriceEur: selling10,
    })
  }
  return rows
}
