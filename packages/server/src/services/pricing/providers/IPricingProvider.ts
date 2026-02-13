/** Pricing provider interface; implementations: Mock, OpenAI, Gemini. @see docs/CODE_REFERENCE.md */
import type {
  PricingMarketCountry,
  PricingMarketMode,
} from '@shared/schemas'

export interface PricingAnalysisInput {
  brand: string
  model: string
  category: string
  condition: string
  colour: string
  notes: string
  askPriceEur?: number
  marketCountry?: PricingMarketCountry
  marketMode?: PricingMarketMode
}

export interface PricingComparable {
  title: string
  price: number
  source: string
  sourceUrl?: string
  marketCountry?: string
  url?: string
}

export interface PricingAnalysisResult {
  estimatedRetailEur: number
  confidence: number
  comps: PricingComparable[]
}

export interface IPricingProvider {
  analyse(input: PricingAnalysisInput): Promise<PricingAnalysisResult>
}
