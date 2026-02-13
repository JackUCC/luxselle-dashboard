import { describe, it, expect } from 'vitest'
import { calculateLandedCost, LandedCostInput } from './landedCost'

describe('calculateLandedCost', () => {
    const defaultInput: LandedCostInput = {
        basePrice: 1000,
        currency: 'JPY',
        rates: { JPY: 160 }, // 1 EUR = 160 JPY
        shipping: 5000,
        insurance: 0,
        customsPct: 10,
        importVatPct: 23,
        platformFeePct: 0,
        paymentFeePct: 0,
        fixedFee: 0,
    }

    it('calculates JPY to EUR correctly', () => {
        // 1 EUR = 160 JPY
        // Base: 1000 JPY / 160 = 6.25 EUR
        // Shipping: 5000 JPY / 160 = 31.25 EUR
        // CIF: 6.25 + 31.25 = 37.50 EUR
        // Duty (10%): 3.75 EUR
        // VAT (23% of 37.5 + 3.75 = 41.25): 9.4875 -> 9.49 EUR
        // Total: 37.5 + 3.75 + 9.4875 = 50.7375 EUR

        const result = calculateLandedCost(defaultInput)

        expect(result.itemCostEur).toBeCloseTo(6.25, 2)
        expect(result.shippingEur).toBeCloseTo(31.25, 2)
        expect(result.cifEur).toBeCloseTo(37.50, 2)
        expect(result.dutyEur).toBeCloseTo(3.75, 2)
        // VAT is calculated on (CIF + Duty)
        // 41.25 * 0.23 = 9.4875
        expect(result.vatEur).toBeCloseTo(9.4875, 4)
        expect(result.totalLandedEur).toBeCloseTo(50.7375, 4)
    })

    it('handles EUR currency correctly (no conversion)', () => {
        const input: LandedCostInput = {
            ...defaultInput,
            currency: 'EUR',
            basePrice: 100,
            shipping: 10,
            rates: null, // Should not matter
        }

        // Base: 100
        // Shipping: 10
        // CIF: 110
        // Duty (10%): 11
        // VAT (23% on 121): 27.83
        // Total: 110 + 11 + 27.83 = 148.83

        const result = calculateLandedCost(input)
        expect(result.itemCostEur).toBe(100)
        expect(result.cifEur).toBe(110)
        expect(result.dutyEur).toBe(11)
        expect(result.vatEur).toBeCloseTo(27.83, 2)
        expect(result.totalLandedEur).toBeCloseTo(148.83, 2)
    })

    it('includes platform and payment fees correctly', () => {
        const input: LandedCostInput = {
            ...defaultInput,
            platformFeePct: 5,
            paymentFeePct: 3,
            fixedFee: 500, // JPY
        }

        // Base: 1000 JPY
        // Valid Fees in JPY:
        // Platform: 1000 * 0.05 = 50
        // Payment: 1000 * 0.03 = 30
        // Fixed: 500
        // Total Fees: 580 JPY
        // Converted Fees (160 rate): 580 / 160 = 3.625 EUR

        // Previously calculated landed cost (without fees) was 50.7375
        // Add fees: 50.7375 + 3.625 = 54.3625

        const result = calculateLandedCost(input)
        expect(result.totalForeignFeesEur).toBeCloseTo(3.625, 3)
        expect(result.totalLandedEur).toBeCloseTo(54.3625, 3)
    })
})
