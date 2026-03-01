export interface MarketComparable {
    title: string
    priceEur: number
    source: string
    sourceUrl?: string
    previewImageUrl?: string
    condition: string
    daysListed?: number
}

export interface MarketComparablePayload extends Omit<MarketComparable, 'previewImageUrl'> {
    previewImageUrl?: string
    thumbnailUrl?: string
    imageUrl?: string
}

export interface MarketResearchResult {
    provider: string
    providerStatus?: 'available' | 'unavailable'
    brand: string
    model: string
    estimatedMarketValueEur: number
    priceRangeLowEur: number
    priceRangeHighEur: number
    suggestedBuyPriceEur: number
    suggestedSellPriceEur: number
    demandLevel: 'very_high' | 'high' | 'moderate' | 'low' | 'very_low'
    priceTrend: 'rising' | 'stable' | 'declining'
    marketLiquidity: 'fast_moving' | 'moderate' | 'slow_moving'
    recommendation: 'strong_buy' | 'buy' | 'hold' | 'pass'
    confidence: number
    marketSummary: string
    keyInsights: string[]
    riskFactors: string[]
    comparables: MarketComparable[]
    seasonalNotes?: string
}

export interface MarketResearchResultPayload extends Omit<MarketResearchResult, 'comparables'> {
    comparables: MarketComparablePayload[]
}
