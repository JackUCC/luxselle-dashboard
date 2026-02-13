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
    sellPriceEur?: number
}

export interface CostBreakdownItem {
    label: string
    amountEur: number
    pct: number
    color: string
}

export interface LandedCostOutput {
    itemCostEur: number
    shippingEur: number
    insuranceEur: number
    dutyEur: number
    vatEur: number
    platformFeeEur: number
    paymentFeeEur: number
    fixedFeeEur: number
    totalForeignFeesEur: number
    cifEur: number
    totalLandedEur: number
    breakdown: CostBreakdownItem[]
    marginEur: number | null
    marginPct: number | null
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
        sellPriceEur,
    } = input

    const rateToEur = currency === 'EUR' ? 1 : rates ? (1 / rates[currency]) || 0 : 0

    // 1. Costs in Original Currency (Base + Fees)
    const itemCost = basePrice
    const platformFee = itemCost * (platformFeePct / 100)
    const paymentFee = itemCost * (paymentFeePct / 100)
    const totalForeignFees = platformFee + paymentFee + fixedFee

    // 2. Convert to EUR
    const itemCostEur = itemCost * rateToEur
    const platformFeeEur = platformFee * rateToEur
    const paymentFeeEur = paymentFee * rateToEur
    const fixedFeeEur = fixedFee * rateToEur
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

    // 5. Build breakdown with percentages
    const total = totalLandedEur || 1 // avoid division by zero
    const breakdown: CostBreakdownItem[] = [
        { label: 'Item Cost', amountEur: itemCostEur, pct: (itemCostEur / total) * 100, color: '#3b82f6' },
        { label: 'Shipping', amountEur: shippingEur, pct: (shippingEur / total) * 100, color: '#8b5cf6' },
        { label: 'Insurance', amountEur: insuranceEur, pct: (insuranceEur / total) * 100, color: '#6366f1' },
        { label: 'Customs Duty', amountEur: dutyEur, pct: (dutyEur / total) * 100, color: '#f59e0b' },
        { label: 'Import VAT', amountEur: vatEur, pct: (vatEur / total) * 100, color: '#ef4444' },
        { label: 'Platform Fee', amountEur: platformFeeEur, pct: (platformFeeEur / total) * 100, color: '#10b981' },
        { label: 'Payment Fee', amountEur: paymentFeeEur, pct: (paymentFeeEur / total) * 100, color: '#14b8a6' },
        { label: 'Fixed Fee', amountEur: fixedFeeEur, pct: (fixedFeeEur / total) * 100, color: '#64748b' },
    ].filter(item => item.amountEur > 0.005) // hide negligible items

    // 6. Margin calculation
    let marginEur: number | null = null
    let marginPct: number | null = null
    if (sellPriceEur != null && sellPriceEur > 0) {
        marginEur = sellPriceEur - totalLandedEur
        marginPct = (marginEur / sellPriceEur) * 100
    }

    return {
        itemCostEur,
        shippingEur,
        insuranceEur,
        dutyEur,
        vatEur,
        platformFeeEur,
        paymentFeeEur,
        fixedFeeEur,
        totalForeignFeesEur: feesEur,
        cifEur,
        totalLandedEur,
        breakdown,
        marginEur,
        marginPct,
    }
}

export interface MaxBuyPriceInput {
    targetSellPriceEur: number
    desiredMarginPct: number
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

/**
 * Calculates the maximum base price (in original currency) you can pay
 * to achieve a desired profit margin at a specific sell price.
 */
export function calculateMaxBuyPrice(input: MaxBuyPriceInput): number {
    const {
        targetSellPriceEur,
        desiredMarginPct,
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
    if (rateToEur <= 0) return 0

    // Target Landed Cost derived from Sell Price and Margin
    // Margin = (Sell - Cost) / Sell  =>  Cost = Sell * (1 - Margin)
    const targetLandedCostEur = targetSellPriceEur * (1 - (desiredMarginPct / 100))

    if (targetLandedCostEur <= 0) return 0

    // Constants based on rates
    const C = customsPct / 100
    const V = importVatPct / 100
    const P = platformFeePct / 100
    const Y = paymentFeePct / 100

    // Multipliers
    const importMultiplier = (1 + C) * (1 + V) // Applied to CIF
    const feeMultiplier = P + Y                // Applied to Base Price

    // Costs that are independent of Base Price (but affected by import taxes)
    const shippingEur = shipping * (currency === 'EUR' ? 1 : rateToEur)
    const insuranceEur = insurance * (currency === 'EUR' ? 1 : rateToEur)
    const fixedFeeEur = fixedFee * rateToEur

    // Total Landed = (Base*R + S_eur + I_eur) * importMultiplier + (Base*R * feeMultiplier) + F_eur
    // Total Landed = Base*R*importMultiplier + (S_eur + I_eur)*importMultiplier + Base*R*feeMultiplier + F_eur
    // Total Landed - (S_eur + I_eur)*importMultiplier - F_eur = Base * R * (importMultiplier + feeMultiplier)

    const constantCostsEur = ((shippingEur + insuranceEur) * importMultiplier) + fixedFeeEur
    const availableForBaseAndFeesEur = targetLandedCostEur - constantCostsEur

    if (availableForBaseAndFeesEur <= 0) return 0

    const denominator = rateToEur * (importMultiplier + feeMultiplier)

    return availableForBaseAndFeesEur / denominator
}
