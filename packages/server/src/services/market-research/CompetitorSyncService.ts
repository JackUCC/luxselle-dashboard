import { logger } from '../../middleware/requestId'
import { CompetitorListingRepo } from '../../repos/CompetitorListingRepo'
import { CompetitorListing, CompetitorListingSourceSchema, DEFAULT_ORG_ID } from '@shared/schemas'
import { v4 as uuidv4 } from 'uuid'

interface ShopifyProduct {
    id: number
    title: string
    handle: string
    published_at: string
    updated_at: string
    product_type: string
    vendor?: string
    variants?: {
        available: boolean
        price: string
    }[]
    images?: {
        src: string
    }[]
}

const COMPETITORS = [
    { name: 'Designer Exchange', url: 'https://www.designerexchange.ie' },
    { name: 'Luxury Exchange', url: 'https://luxuryexchange.ie' },
    { name: 'Siopaella', url: 'https://www.siopaella.com' },
]

export class CompetitorSyncService {
    private readonly repo = new CompetitorListingRepo()

    async syncAll(limitPerStore = 500) {
        logger.info('competitor_sync_started', { limitPerStore })
        const results = []

        for (const competitor of COMPETITORS) {
            try {
                const result = await this.syncStore(competitor, limitPerStore)
                results.push({ store: competitor.name, ...result })
            } catch (error) {
                logger.error('competitor_sync_failed', {
                    store: competitor.name,
                    message: error instanceof Error ? error.message : String(error)
                })
                results.push({ store: competitor.name, success: false, error: String(error) })
            }
        }

        logger.info('competitor_sync_completed', { results })
        return results
    }

    private async syncStore(competitor: { name: string, url: string }, limit: number) {
        const url = `${competitor.url}/products.json?limit=${limit}`
        logger.info('fetching_competitor_products', { url })

        const response = await fetch(url)
        if (!response.ok) {
            throw new Error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`)
        }

        const data = await response.json() as { products: ShopifyProduct[] }
        const products = data.products || []

        let newCount = 0
        let updatedCount = 0
        let soldOutCount = 0

        for (const p of products) {
            // Validate basic required fields
            if (!p.id || !p.title || !p.handle) continue

            const sourceResult = CompetitorListingSourceSchema.safeParse(competitor.name)
            if (!sourceResult.success) continue

            const externalId = String(p.id)
            const priceEur = p.variants?.[0]?.price ? parseFloat(p.variants[0].price) : 0
            if (priceEur <= 0) continue

            const isAvailable = Boolean(p.variants?.[0]?.available)
            const imageUrl = p.images?.[0]?.src
            const listedAt = p.published_at

            const existing = await this.repo.findByExternalId(externalId)

            if (!existing) {
                if (isAvailable) {
                    await this.repo.create({
                        id: uuidv4(),
                        organisationId: DEFAULT_ORG_ID,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        source: sourceResult.data,
                        externalId,
                        title: p.title,
                        handle: `${competitor.url}/products/${p.handle}`,
                        priceEur,
                        imageUrl,
                        listedAt,
                        isAvailable: true,
                        brand: p.vendor,
                        productType: p.product_type,
                    })
                    newCount++
                }
            } else {
                let changed = false
                const updates: Partial<CompetitorListing> = { updatedAt: new Date().toISOString() }

                if (existing.priceEur !== priceEur) {
                    updates.priceEur = priceEur
                    changed = true
                }

                if (existing.isAvailable !== isAvailable) {
                    updates.isAvailable = isAvailable
                    if (!isAvailable && !existing.soldAt) {
                        updates.soldAt = new Date().toISOString()
                        soldOutCount++
                    }
                    changed = true
                }

                if (changed) {
                    await this.repo.set(existing.id, updates)
                    updatedCount++
                }
            }
        }

        return {
            success: true,
            totalFetched: products.length,
            newCount,
            updatedCount,
            soldOutCount
        }
    }
}
