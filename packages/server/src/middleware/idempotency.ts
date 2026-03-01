/**
 * Idempotency middleware: X-Idempotency-Key header; stores completed response in Firestore for replay; 409 if same key in progress.
 * generateFileIdempotencyKey used for supplier CSV imports (hash of supplier + content + date).
 * @see docs/CODE_REFERENCE.md
 * References: Express, Firestore
 */
import { Request, Response, NextFunction } from 'express'
import { createHash } from 'node:crypto'
import { db } from '../config/firebase'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'

const IDEMPOTENCY_COLLECTION = 'idempotency_keys'
const KEY_TTL_SECONDS = 24 * 60 * 60 // 24 hours

function normalizePath(path: string): string {
  if (!path) {
    return '/'
  }

  const singleSlashPath = path.replace(/\/+/g, '/')
  if (singleSlashPath.length > 1 && singleSlashPath.endsWith('/')) {
    return singleSlashPath.slice(0, -1)
  }

  return singleSlashPath
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(',')}]`
  }

  const sortedEntries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableSerialize(nestedValue)}`)

  return `{${sortedEntries.join(',')}}`
}

function buildRequestFingerprint(req: Request): string {
  const normalizedPath = normalizePath(`${req.baseUrl || ''}${req.path || ''}`)
  const bodyHash = createHash('sha256')
    .update(stableSerialize(req.body))
    .digest('hex')

  return `${req.method.toUpperCase()}:${normalizedPath}:${bodyHash}`
}

export interface IdempotentRequest extends Request {
  idempotencyKey?: string
  isReplay?: boolean
  replayResponse?: unknown
}

/**
 * Middleware to handle idempotency keys for critical operations.
 * 
 * Usage:
 *   router.post('/critical-action', idempotency, handler)
 * 
 * Client sends: X-Idempotency-Key: <uuid>
 * 
 * If the key has been used before:
 *   - Returns the cached response
 * If the key is new:
 *   - Proceeds with the request
 *   - Stores the response for future replays
 */
export async function idempotency(
  req: IdempotentRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const idempotencyKey = req.headers['x-idempotency-key']
  
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    // No idempotency key - proceed normally
    next()
    return
  }

  req.idempotencyKey = idempotencyKey
  const fingerprint = buildRequestFingerprint(req)

  try {
    const keyRef = db.collection(IDEMPOTENCY_COLLECTION).doc(idempotencyKey)
    const keyDoc = await keyRef.get()

    if (keyDoc.exists) {
      const data = keyDoc.data()
      if (data?.fingerprint !== fingerprint) {
        res.status(409).json(
          formatApiError(
            API_ERROR_CODES.CONFLICT,
            'Idempotency key reuse across different requests is invalid; use a new idempotency key for each unique request'
          )
        )
        return
      }
      
      // Key exists - check if the response is ready
      if (data?.status === 'completed' && data?.response) {
        // Return cached response
        req.isReplay = true
        res.status(data.statusCode || 200).json(data.response)
        return
      }
      
      if (data?.status === 'pending') {
        // Request is still in progress - conflict
        res.status(409).json(
          formatApiError(API_ERROR_CODES.CONFLICT, 'Request with this idempotency key is already in progress')
        )
        return
      }
    }

    // New key - mark as pending
    await keyRef.set({
      status: 'pending',
      createdAt: new Date().toISOString(),
      method: req.method,
      path: normalizePath(`${req.baseUrl || ''}${req.path || ''}`),
      fingerprint,
      expiresAt: new Date(Date.now() + KEY_TTL_SECONDS * 1000).toISOString(),
    })

    // Override res.json to capture the response
    const originalJson = res.json.bind(res)
    res.json = function(body: unknown): Response {
      // Store the response for future replays
      keyRef.set({
        status: 'completed',
        statusCode: res.statusCode,
        response: body,
        completedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + KEY_TTL_SECONDS * 1000).toISOString(),
      }, { merge: true }).catch(console.error)
      
      return originalJson(body)
    }

    next()
  } catch (error) {
    console.error('Idempotency middleware error:', error)
    // Don't block the request on idempotency failures
    next()
  }
}

/**
 * Generate a hash-based idempotency key from file content and timestamp
 */
export function generateFileIdempotencyKey(
  supplierId: string,
  fileContent: string,
  timestamp: Date
): string {
  const hash = createHash('sha256')
  hash.update(supplierId)
  hash.update(fileContent)
  hash.update(timestamp.toISOString().split('T')[0]) // Date only for daily uniqueness
  return `import-${hash.digest('hex').slice(0, 16)}`
}
