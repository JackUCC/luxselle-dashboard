import { db } from '../src/config/firebase'
import { logger } from '../src/middleware/requestId'

async function fixTypo() {
    logger.info('Starting Siopaella typo fix...')
    const snapshot = await db.collection('competitorListings')
        .where('source', '==', 'Siopaella')
        .get()

    if (snapshot.empty) {
        logger.info('No documents found with Siopaella typo. All good.')
        process.exit(0)
    }

    const batch = db.batch()
    let count = 0

    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { source: 'Siopella' })
        count++
        if (count % 500 === 0) {
            // Firestore batches are limited to 500 operations, but our list size per store is exactly 10 right now from manual testing.
        }
    })

    await batch.commit()
    logger.info(`Fixed ${count} documents.`)
    process.exit(0)
}

fixTypo().catch(console.error)
