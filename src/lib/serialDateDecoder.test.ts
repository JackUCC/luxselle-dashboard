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
    })

    it('decodes 1990-2006 format (month/year)', () => {
      const r = decodeSerialToYear('SP0065', 'Louis Vuitton')
      expect(r.success).toBe(true)
      expect(r.year).toBe(2005)
      expect(r.period).toBe('June')
    })

    it('decodes 1980s format (3-4 digits)', () => {
      const r = decodeSerialToYear('844', 'Louis Vuitton')
      expect(r.success).toBe(true)
      expect(r.year).toBe(1984)
      expect(r.period).toBe('April')
    })

    it('returns failure for invalid LV code', () => {
      const r = decodeSerialToYear('INVALID', 'Louis Vuitton')
      expect(r.success).toBe(false)
      expect(r.message.length).toBeGreaterThan(0)
    })
  })

  describe('Chanel', () => {
    it('decodes 8-digit serial (first two = year)', () => {
      const r = decodeSerialToYear('25123456', 'Chanel')
      expect(r.success).toBe(true)
      expect(r.year).toBe(2025)
    })

    it('decodes 7-digit serial', () => {
      const r = decodeSerialToYear('6123456', 'Chanel')
      expect(r.success).toBe(true)
      expect(r.year).toBe(1996)
    })

    it('returns failure for empty serial', () => {
      const r = decodeSerialToYear('', 'Chanel')
      expect(r.success).toBe(false)
      expect(r.message).toContain('Enter')
    })
  })

  describe('Other brands', () => {
    it('returns guidance for Gucci / Hermès / Other', () => {
      const r = decodeSerialToYear('ABC123', 'Gucci')
      expect(r.success).toBe(false)
      expect(r.message).toContain("don't have a date decoder")
    })
  })
})
