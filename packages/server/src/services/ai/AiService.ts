import { env } from '../../config/env'
import { Product } from '@shared/schemas'

export interface BusinessInsights {
    insights: string[]
    generatedAt: string
}

export class AiService {
    private openai: any

    private async getOpenAI() {
        if (!this.openai) {
            const OpenAI = (await import('openai')).default
            this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY })
        }
        return this.openai
    }

    async generateProductDescription(product: Partial<Product>): Promise<string> {
        if (env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) {
            return this.mockDescription(product)
        }

        try {
            const openai = await this.getOpenAI()
            const prompt = `Write a compelling, luxury-focused product description for SEO for the following item.
      
Brand: ${product.brand}
Model: ${product.model}
Category: ${product.category || 'Luxury Item'}
Condition: ${product.condition || 'Pre-owned'}
Colour: ${product.colour || ''}
Key Features: ${product.notes || ''}

The description should be professional, highlighting the craftsmanship and value. Keep it under 150 words. Do not use markdown formatting, just plain text paragraphs.`

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 300,
                temperature: 0.7,
            })

            return response.choices[0]?.message?.content?.trim() ?? ''
        } catch (error) {
            console.error('AI Description Generation Failed:', error)
            return this.mockDescription(product)
        }
    }

    async generateBusinessInsights(kpis: any): Promise<BusinessInsights> {
        if (env.AI_PROVIDER !== 'openai' || !env.OPENAI_API_KEY) {
            return this.mockInsights()
        }

        try {
            const openai = await this.getOpenAI()
            const prompt = `Analyze these business KPIs for a luxury reseller and provide 3 short, actionable, bullet-point insights (max 1 sentence each) to improve performance or highlight risks.

KPIs:
- Total Inventory Value: €${kpis.totalInventoryValue}
- Pending Buy List Value: €${kpis.pendingBuyListValue}
- Active Sourcing Pipeline: €${kpis.activeSourcingPipeline}
- Low Stock Items: ${kpis.lowStockAlerts}
- Total Revenue (Recent): €${kpis.revenue || 0}
- Margin: ${kpis.margin || 0}%

Return ONLY a valid JSON object:
{
  "insights": ["insight 1", "insight 2", "insight 3"]
}`

            const response = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 300,
                temperature: 0.7,
            })

            const text = response.choices[0]?.message?.content ?? ''
            const jsonMatch = text.match(/\{[\s\S]*\}/)

            if (!jsonMatch) throw new Error('No JSON found in AI response')

            const parsed = JSON.parse(jsonMatch[0])
            return {
                insights: parsed.insights || [],
                generatedAt: new Date().toISOString()
            }

        } catch (error) {
            console.error('AI Insights Generation Failed:', error)
            return this.mockInsights()
        }
    }

    private mockDescription(product: Partial<Product>): string {
        return `[MOCK AI] This beautiful ${product.brand} ${product.model} in ${product.colour || 'classic'} finish is a testament to timeless luxury. In ${product.condition} condition, it represents an excellent opportunity for collectors and enthusiasts alike.`
    }

    private mockInsights(): BusinessInsights {
        return {
            insights: [
                "Inventory levels are optimal, but consider increasing sourcing for high-demand items.",
                "Pending buy list value is high; prioritize closing these deals to boost stock.",
                "Margin is healthy, but keep an eye on aging low-stock items."
            ],
            generatedAt: new Date().toISOString()
        }
    }
}
