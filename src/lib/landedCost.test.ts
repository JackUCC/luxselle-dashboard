import { describe, it, expect } from 'vitest'
import { calculateLandedCost, calculateMaxBuyPrice } from './landedCost'

describe('Landed Cost Calculator', () => {
    // Mock rates: 1 EUR = 1.1 USD, 0.85 GBP, 130 JPY
    // So 1 USD = 1/1.1 EUR, 1 GBP = 1/0.85 EUR, 1 JPY = 1/130 EUR
    const mockRates = {
        USD: 1.1,
        GBP: 0.85,
        JPY: 130,
    }

    it('calculates landed cost correctly for EUR (simplest case)', () => {
        const result = calculateLandedCost({
            basePrice: 100,
            currency: 'EUR',
            rates: mockRates,
            shipping: 10,
            insurance: 0,
            customsPct: 0,
            importVatPct: 23,
            platformFeePct: 0,
            paymentFeePct: 0,
            fixedFee: 0,
            sellPriceEur: 200, // Expected margin
        })

        // Item: 100
        // Ship: 10
        // CIF: 110
        // Duty: 0
        // VAT: 110 * 0.23 = 25.3
        // Total: 110 + 25.3 = 135.3

        expect(result.cifEur).toBeCloseTo(110)
        expect(result.vatEur).toBeCloseTo(25.3)
        expect(result.totalLandedEur).toBeCloseTo(135.3)
        expect(result.marginEur).toBeCloseTo(200 - 135.3)
    })

    it('calculates landed cost correctly for JPY with duties and fees', () => {
        // 10,000 JPY item
        // Rate: 130 JPY = 1 EUR => 10,000 / 130 = 76.92 EUR
        const basePriceJpy = 10000

        const result = calculateLandedCost({
            basePrice: basePriceJpy,
            currency: 'JPY',
            rates: mockRates,
            shipping: 2000, // JPY
            insurance: 0,
            customsPct: 10,
            importVatPct: 23,
            platformFeePct: 5,
            paymentFeePct: 3,
            fixedFee: 500, // JPY
        })

        const rateToEur = 1 / 130
        const baseEur = basePriceJpy * rateToEur
        const shipEur = 2000 * rateToEur
        const fixedFeeEur = 500 * rateToEur

        // Fees on Base: 5% + 3% = 8%
        const feesForeign = basePriceJpy * 0.08
        const feesEur = feesForeign * rateToEur + fixedFeeEur

        // CIF = BaseEur + ShipEur
        const cifEur = baseEur + shipEur

        // Duty = CIF * 10%
        const dutyEur = cifEur * 0.10

        // VAT = (CIF + Duty) * 23%
        const vatBase = cifEur + dutyEur
        const vatEur = vatBase * 0.23

        const expectedTotal = cifEur + dutyEur + vatEur + feesEur

        expect(result.totalLandedEur).toBeCloseTo(expectedTotal)
    })

    it('reverses calculation correctly (Target Buy Price)', () => {
        // Scenario: We want to sell for 200 EUR with a 30% margin.
        // Target Landed Cost = 200 * (1 - 0.30) = 140 EUR.
        // We need to find the Base Price (in JPY) that results in ~140 EUR landed cost.

        const targetSellPrice = 200
        const targetMarginPct = 30

        const input = {
            targetSellPriceEur: targetSellPrice,
            desiredMarginPct: targetMarginPct,
            currency: 'JPY' as const,
            rates: mockRates,
            shipping: 3000,
            insurance: 0,
            customsPct: 12,
            importVatPct: 23,
            platformFeePct: 10, // Platform + Payment
            paymentFeePct: 0,
            fixedFee: 1000,
        }

        const maxBuyPriceJpy = calculateMaxBuyPrice(input)

        // Verifying by plugging the result back into the forward calculator
        const forwardResult = calculateLandedCost({
            basePrice: maxBuyPriceJpy,
            currency: 'JPY',
            rates: mockRates,
            shipping: input.shipping,
            insurance: input.insurance,
            customsPct: input.customsPct,
            importVatPct: input.importVatPct,
            platformFeePct: input.platformFeePct,
            paymentFeePct: input.paymentFeePct,
            fixedFee: input.fixedFee,
            sellPriceEur: targetSellPrice,
        })

        // Expected Margin should be very close to 30%
        expect(forwardResult.marginPct).toBeCloseTo(targetMarginPct, 1) // Allow small precision diff

        // Expected Landed cost should be ~140
        expect(forwardResult.totalLandedEur).toBeCloseTo(140, 1)
    })

    it('returns 0 if costs exceed target price', () => {
        const maxBuyPrice = calculateMaxBuyPrice({
            targetSellPriceEur: 100,
            desiredMarginPct: 50, // Landed target = 50 EUR
            currency: 'EUR',
            rates: mockRates,
            shipping: 60, // Shipping alone is 60 EUR, already over budget
            insurance: 0,
            customsPct: 0,
            importVatPct: 0,
            platformFeePct: 0,
            paymentFeePct: 0,
            fixedFee: 0,
        })
        expect(maxBuyPrice).toBeLessThanOrEqual(0)
    })

    it('calculates correctly with zero duty and zero VAT (duty-free import)', () => {
        const result = calculateLandedCost({
            basePrice: 200,
            currency: 'EUR',
            rates: mockRates,
            shipping: 20,
            insurance: 0,
            customsPct: 0,
            importVatPct: 0,
            platformFeePct: 0,
            paymentFeePct: 0,
            fixedFee: 0,
            sellPriceEur: 300,
        })

        // No duty, no VAT: landed cost = CIF = 200 + 20 = 220
        expect(result.dutyEur).toBeCloseTo(0)
        expect(result.vatEur).toBeCloseTo(0)
        expect(result.cifEur).toBeCloseTo(220)
        expect(result.totalLandedEur).toBeCloseTo(220)
        expect(result.marginEur).toBeCloseTo(80)
        expect(result.marginPct).toBeCloseTo((80 / 300) * 100)
    })

    it('returns null margin fields when no sellPriceEur is provided', () => {
        const result = calculateLandedCost({
            basePrice: 100,
            currency: 'EUR',
            rates: mockRates,
            shipping: 10,
            insurance: 0,
            customsPct: 5,
            importVatPct: 20,
            platformFeePct: 0,
            paymentFeePct: 0,
            fixedFee: 0,
            // sellPriceEur intentionally omitted
        })

        expect(result.marginEur).toBeNull()
        expect(result.marginPct).toBeNull()
        expect(result.totalLandedEur).toBeGreaterThan(0)
    })

    it('returns 0 from calculateMaxBuyPrice when rates is null (unknown currency rate)', () => {
        const result = calculateMaxBuyPrice({
            targetSellPriceEur: 500,
            desiredMarginPct: 30,
            currency: 'USD',
            rates: null, // No rate data available
            shipping: 20,
            insurance: 0,
            customsPct: 5,
            importVatPct: 20,
            platformFeePct: 5,
            paymentFeePct: 2,
            fixedFee: 0,
        })

        expect(result).toBe(0)
    })
})
