export interface LandedCostInput {
    basePrice: number
    currency: 'EUR' | 'USD' | 'GBP' | 'JPY'
    rates: Record<string, number> | null
    shipping: number
    insurance: number
    customsPct: number
    importVatPct: number
    platformFeePct: number
    paymentFeePct: number
    fixedFee: number
}

export interface LandedCostOutput {
    itemCostEur: number
    shippingEur: number
    insuranceEur: number
    dutyEur: number
    vatEur: number
    totalForeignFeesEur: number
    cifEur: number
    totalLandedEur: number
}

export function calculateLandedCost(input: LandedCostInput): LandedCostOutput {
    const {
        basePrice,
        currency,
        rates,
        shipping,
        insurance,
        customsPct,
        importVatPct,
        platformFeePct,
        paymentFeePct,
        fixedFee,
    } = input

    const rateToEur = currency === 'EUR' ? 1 : rates ? (1 / rates[currency]) || 0 : 0

    // 1. Costs in Original Currency (Base + Fees)
    const itemCost = basePrice
    const platformFee = itemCost * (platformFeePct / 100)
    const paymentFee = itemCost * (paymentFeePct / 100)
    const totalForeignFees = platformFee + paymentFee + fixedFee

    // 2. Convert to EUR
    const itemCostEur = itemCost * rateToEur
    const feesEur = totalForeignFees * rateToEur
    const shippingEur = shipping * (currency === 'EUR' ? 1 : rateToEur)
    const insuranceEur = insurance * (currency === 'EUR' ? 1 : rateToEur)

    // 3. Duty (CIF: Cost + Insurance + Freight)
    const cifEur = itemCostEur + shippingEur + insuranceEur
    const dutyEur = cifEur * (customsPct / 100)

    // 4. VAT (CIF + Duty)
    const vatBaseEur = cifEur + dutyEur
    const vatEur = vatBaseEur * (importVatPct / 100)

    const totalLandedEur = cifEur + dutyEur + vatEur + feesEur

    return {
        itemCostEur,
        shippingEur,
        insuranceEur,
        dutyEur,
        vatEur,
        totalForeignFeesEur: feesEur,
        cifEur,
        totalLandedEur,
    }
}
