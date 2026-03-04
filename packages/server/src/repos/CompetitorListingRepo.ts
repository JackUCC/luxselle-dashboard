import { BaseRepo } from './BaseRepo'
import {
    CompetitorListing,
    CompetitorListingSchema,
    DEFAULT_ORG_ID,
} from '@shared/schemas'

export class CompetitorListingRepo extends BaseRepo<CompetitorListing> {
    constructor() {
        super('competitorListings', CompetitorListingSchema)
    }

    /**
     * Finds a single competitor listing by its externalId (Shopify product ID).
     */
    async findByExternalId(externalId: string): Promise<CompetitorListing | null> {
        const results = await this.list(DEFAULT_ORG_ID, [
            { field: 'externalId', op: '==', value: externalId }
        ], { limit: 1 })

        return results[0] || null
    }

    /**
     * Lists recently listed or updated items across competitors.
     * Orders by listedAt descending.
     */
    async getRecentListings(limit = 20): Promise<CompetitorListing[]> {
        return this.list(DEFAULT_ORG_ID, [], {
            orderBy: [{ field: 'listedAt', direction: 'desc' }],
            limit
        })
    }
}
