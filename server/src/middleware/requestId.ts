import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

export interface RequestWithId extends Request {
  requestId: string
  startTime: number
}

/**
 * Middleware to add request ID and timing to all requests.
 * Enables correlation of logs and tracking request duration.
 */
export function requestId(
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void {
  // Use provided request ID or generate a new one
  const id = (req.headers['x-request-id'] as string) || randomUUID()
  
  req.requestId = id
  req.startTime = Date.now()
  
  // Add request ID to response headers
  res.setHeader('X-Request-Id', id)
  
  next()
}

/**
 * Structured logger for JSON logging
 */
export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }))
  },
  
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }))
  },
  
  error: (message: string, error?: unknown, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      ...meta,
    }))
  },
}

/**
 * Middleware to log all requests with structured JSON
 */
export function requestLogger(
  req: RequestWithId,
  res: Response,
  next: NextFunction
): void {
  // Log request
  logger.info('request_start', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    userAgent: req.headers['user-agent'],
  })

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - req.startTime
    const logFn = res.statusCode >= 400 ? logger.warn : logger.info
    
    logFn('request_end', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    })
  })

  next()
}

/**
 * Error tracking for error budget monitoring
 */
type ErrorType = 'rateLimit' | 'firestore' | 'aiProvider' | 'validation' | 'internal'

export const errorTracker = {
  counts: {
    rateLimit: 0,
    firestore: 0,
    aiProvider: 0,
    validation: 0,
    internal: 0,
  } as Record<ErrorType, number>,
  
  track(type: ErrorType) {
    this.counts[type] = (this.counts[type] || 0) + 1
    logger.warn('error_tracked', {
      errorType: type,
      totalCount: this.counts[type],
    })
  },
  
  getStats(): Record<ErrorType, number> {
    return { ...this.counts }
  },
  
  reset() {
    const keys = Object.keys(this.counts) as ErrorType[]
    keys.forEach(key => {
      this.counts[key] = 0
    })
  },
}
