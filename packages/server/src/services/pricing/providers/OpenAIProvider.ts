/** OpenAI-based pricing analysis for luxury goods. @see docs/CODE_REFERENCE.md */
import OpenAI from 'openai'
import type {
  IPricingProvider,
  PricingAnalysisInput,
  PricingAnalysisResult,
} from './IPricingProvider'

export class OpenAIProvider implements IPricingProvider {
  private client: OpenAI

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  async analyse(input: PricingAnalysisInput): Promise<PricingAnalysisResult> {
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

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.3,
    })

    const text = response.choices[0]?.message?.content ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('OpenAI returned no valid JSON for pricing analysis')
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
