import { describe, it, expect } from 'vitest'
import { usdToEur } from './fx'

describe('usdToEur', () => {
  it('converts USD to EUR using rate', () => {
    expect(usdToEur(100, 0.92)).toBe(92)
    expect(usdToEur(100, 1)).toBe(100)
  })

  it('rounds to two decimal places', () => {
    expect(usdToEur(10, 0.9234)).toBe(9.23)
    expect(usdToEur(33.33, 0.92)).toBe(30.66)
  })

  it('handles zero', () => {
    expect(usdToEur(0, 0.92)).toBe(0)
  })

  it('keeps two-decimal stability for pricing values', () => {
    expect(usdToEur(199.99, 0.9234)).toBe(184.67)
    expect(usdToEur(1499.5, 0.91)).toBe(1364.55)
  })
})
