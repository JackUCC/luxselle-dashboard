/** Gemini-based pricing analysis for luxury goods. @see docs/CODE_REFERENCE.md */
import { GoogleGenerativeAI } from '@google/generative-ai'
import type {
  IPricingProvider,
  PricingAnalysisInput,
  PricingAnalysisResult,
} from './IPricingProvider'

export class GeminiProvider implements IPricingProvider {
  private genAI: GoogleGenerativeAI

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey)
  }

  async analyse(input: PricingAnalysisInput): Promise<PricingAnalysisResult> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const prompt = `You are a luxury goods pricing expert. Analyse this item and estimate its current retail market value in EUR.

Brand: ${input.brand}
Model: ${input.model}
Category: ${input.category}
Condition: ${input.condition}
Colour: ${input.colour}
Notes: ${input.notes}
${input.askPriceEur ? `Asking Price: €${input.askPriceEur}` : ''}

Return ONLY a JSON object with this exact structure (no markdown, no explanation):
{
  "estimatedRetailEur": <number>,
  "confidence": <number between 0 and 1>,
  "comps": [
    { "title": "<comparable listing title>", "price": <number in EUR>, "source": "<marketplace name>" }
  ]
}

Provide 2-4 realistic comparable listings from known luxury marketplaces (Vestiaire Collective, The RealReal, Rebag, Fashionphile, etc.).`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Gemini returned no valid JSON for pricing analysis')
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      estimatedRetailEur: number
      confidence: number
      comps: Array<{ title: string; price: number; source: string; url?: string }>
    }

    return {
      estimatedRetailEur: Math.round(parsed.estimatedRetailEur),
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
      comps: parsed.comps.map((c) => ({
        title: c.title,
        price: Math.round(c.price),
        source: c.source,
        url: c.url,
      })),
    }
  }
}
