import { CompetitorSyncService } from '../src/services/market-research/CompetitorSyncService'
import { logger } from '../src/middleware/requestId'

async function main() {
    process.env.DEBUG = 'true'
    logger.info('Starting manual competitor sync...')

    const service = new CompetitorSyncService()
    const results = await service.syncAll(10) // Small limit for testing

    logger.info('Manual sync completed', { results })
    process.exit(0)
}

main().catch(error => {
    logger.error('Fatal error in competitor sync script', error)
    process.exit(1)
})
