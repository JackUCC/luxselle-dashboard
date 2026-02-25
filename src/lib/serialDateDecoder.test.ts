/**
 * Unit tests for serial/date code decoding (LV, Chanel).
 */
import { describe, it, expect } from 'vitest'
import { decodeSerialToYear } from './serialDateDecoder'

describe('serialDateDecoder', () => {
  describe('Louis Vuitton', () => {
    it('decodes 2007+ format (2 letters + 4 digits: week/year)', () => {
      const r = decodeSerialToYear('SR3179', 'Louis Vuitton')
      expect(r.success).toBe(true)
      expect(r.year).toBe(2019)
      expect(r.period).toBe('Week 37')
      expect(r.message).toContain('2019')
      expect(r.precision).toBe('exact_week')
      expect(r.source).toBe('rule_based')
      expect(r.confidence).toBeGreaterThan(0.9)
      expect(r.productionWindow).toEqual({ startYear: 2019, endYear: 2019 })
      expect(r.rationale.length).toBeGreaterThan(0)
    })

    it('decodes 1990-2006 format (month/year)', () => {
      const r = decodeSerialToYear('SP0065', 'Louis Vuitton')
      expect(r.success).toBe(true)
      expect(r.year).toBe(2005)
      expect(r.period).toBe('June')
      expect(r.precision).toBe('exact_month')
      expect(r.productionWindow).toEqual({
        startYear: 2005,
        endYear: 2005,
        startMonth: 6,
        endMonth: 6,
      })
    })

    it('decodes 1980s format (3-4 digits)', () => {
      const r = decodeSerialToYear('844', 'Louis Vuitton')
      expect(r.success).toBe(true)
      expect(r.year).toBe(1984)
      expect(r.period).toBe('April')
      expect(r.precision).toBe('exact_month')
    })

    it('returns failure for invalid LV code', () => {
      const r = decodeSerialToYear('INVALID', 'Louis Vuitton')
      expect(r.success).toBe(false)
      expect(r.message.length).toBeGreaterThan(0)
      expect(r.precision).toBe('unknown')
      expect(r.confidence).toBe(0)
    })
  })

  describe('Chanel', () => {
    it('decodes 8-digit serial to a narrow range', () => {
      const r = decodeSerialToYear('25123456', 'Chanel')
      expect(r.success).toBe(true)
      expect(r.precision).toBe('exact_year')
      expect(r.year).toBe(2018)
      expect(r.productionWindow).toEqual({ startYear: 2018, endYear: 2018 })
    })

    it('decodes 7-digit serial to a year window', () => {
      const r = decodeSerialToYear('6123456', 'Chanel')
      expect(r.success).toBe(true)
      expect(r.precision).toBe('year_window')
      expect(r.year).toBeUndefined()
      expect(r.productionWindow).toEqual({ startYear: 2000, endYear: 2002 })
      expect(r.uncertainties.length).toBeGreaterThan(0)
    })

    it('returns failure for empty serial', () => {
      const r = decodeSerialToYear('', 'Chanel')
      expect(r.success).toBe(false)
      expect(r.message).toContain('Enter')
    })

    it('returns microchip-era message for 8-digit code with prefix > 32', () => {
      const r = decodeSerialToYear('33123456', 'Chanel')
      expect(r.success).toBe(false)
      expect(r.message).toContain('microchip era')
      expect(r.note).toContain('2021')
    })
  })

  describe('Hermès', () => {
    it('decodes single-letter blind stamp to year (1997–2014)', () => {
      const r = decodeSerialToYear('J', 'Hermès')
      expect(r.success).toBe(true)
      expect(r.year).toBe(2006)
      expect(r.precision).toBe('exact_year')
      expect(r.message).toContain('2006')
      expect(r.formatMatched).toBe('HERMES_BLIND_STAMP_LETTER')
    })

    it('decodes letter D as 2000', () => {
      const r = decodeSerialToYear('D', 'Hermès')
      expect(r.success).toBe(true)
      expect(r.year).toBe(2000)
    })

    it('returns failure for non-letter or multi-char', () => {
      const r = decodeSerialToYear('99', 'Hermès')
      expect(r.success).toBe(false)
      expect(r.message).toContain('blind stamp')
    })
  })

  describe('Other brands', () => {
    it('returns guidance for Gucci / Hermès / Other', () => {
      const r = decodeSerialToYear('ABC123', 'Gucci')
      expect(r.success).toBe(false)
      expect(r.message).toContain("don't have a date decoder")
      expect(r.brand).toBe('Gucci')
      expect(r.precision).toBe('unknown')
      expect(r.note).toContain('AI heuristic decode')
    })
  })
})
