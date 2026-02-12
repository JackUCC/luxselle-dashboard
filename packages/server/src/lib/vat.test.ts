import { describe, it, expect } from 'vitest'
import { vatFromNet, vatFromGross } from './vat'

describe('vat', () => {
  describe('vatFromNet', () => {
    it('computes VAT and gross from net amount', () => {
      const { vatEur, grossEur } = vatFromNet(100, 20)
      expect(vatEur).toBe(20)
      expect(grossEur).toBe(120)
    })

    it('rounds to two decimals', () => {
      const { vatEur, grossEur } = vatFromNet(33.33, 20)
      expect(vatEur).toBe(6.67)
      expect(grossEur).toBe(40)
    })

    it('handles zero rate', () => {
      const { vatEur, grossEur } = vatFromNet(100, 0)
      expect(vatEur).toBe(0)
      expect(grossEur).toBe(100)
    })
  })

  describe('vatFromGross', () => {
    it('computes net and VAT from gross amount', () => {
      const { netEur, vatEur } = vatFromGross(120, 20)
      expect(netEur).toBe(100)
      expect(vatEur).toBe(20)
    })

    it('rounds to two decimals', () => {
      const { netEur, vatEur } = vatFromGross(100, 20)
      expect(netEur).toBe(83.33)
      expect(vatEur).toBe(16.67)
    })

    it('handles zero rate', () => {
      const { netEur, vatEur } = vatFromGross(100, 0)
      expect(netEur).toBe(100)
      expect(vatEur).toBe(0)
    })
  })
})
