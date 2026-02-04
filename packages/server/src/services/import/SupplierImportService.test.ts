import { describe, it, expect } from 'vitest'
import { parse } from 'csv-parse/sync'

const BRAND_STREET_TOKYO_REQUIRED_HEADERS = [
  'Brand',
  'SKU',
  'For you in USD',
  'STATUS',
] as const

describe('CSV import mapping', () => {
  it('parses CSV with columns: true and returns rows with expected keys', () => {
    const csv = [
      'Brand,SKU,Title,Rank,STATUS,For you in USD,Selling Price',
      'Chanel,SKU-1,Classic Flap,A,UPLOADED,100,120',
    ].join('\n')

    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    expect(records).toHaveLength(1)
    const row = records[0] as Record<string, string>
    expect(row.Brand).toBe('Chanel')
    expect(row.SKU).toBe('SKU-1')
    expect(row['For you in USD']).toBe('100')
    expect(row.STATUS).toBe('UPLOADED')
  })

  it('has required headers for Brand Street Tokyo format', () => {
    const csv = [
      'Brand,SKU,For you in USD,STATUS',
      'Hermès,H-1,50,WAITING',
    ].join('\n')

    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    expect(records).toHaveLength(1)
    const row = records[0] as Record<string, string>
    for (const header of BRAND_STREET_TOKYO_REQUIRED_HEADERS) {
      expect(Object.keys(row)).toContain(header)
    }
    expect(row.Brand).toBe('Hermès')
    expect(row['For you in USD']).toBe('50')
  })

  it('parses multiple rows', () => {
    const csv = [
      'Brand,SKU,For you in USD,STATUS',
      'A,1,10,UPLOADED',
      'B,2,20,SOLD',
    ].join('\n')

    const records = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })

    expect(records).toHaveLength(2)
    expect((records[0] as Record<string, string>)['For you in USD']).toBe('10')
    expect((records[1] as Record<string, string>)['For you in USD']).toBe('20')
  })
})
