import { Request, Response, NextFunction } from 'express'
import { getAuth } from 'firebase-admin/auth'
import type { UserRole } from '@shared/schemas'
import { adminApp } from '../config/firebase'
import { API_ERROR_CODES, formatApiError } from '../lib/errors'
import { env } from '../config/env'

// Extend Express Request type to include user info
export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string
    email?: string
    role: UserRole
    orgId: string
  }
}

// Get Firebase Auth instance
const auth = getAuth(adminApp)

/**
 * Middleware to verify Firebase ID tokens and extract user info
 * 
 * Usage:
 *   router.post('/protected', requireAuth, handler)
 *   router.get('/admin-only', requireAuth, requireRole('admin'), handler)
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Skip auth in development if explicitly disabled
  if (env.SKIP_AUTH === 'true') {
    req.user = {
      uid: 'dev-user',
      email: 'dev@luxselle.local',
      role: 'admin',
      orgId: 'default',
    }
    next()
    return
  }

  const authHeader = req.headers.authorization
  
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json(
      formatApiError(API_ERROR_CODES.UNAUTHORIZED, 'Missing or invalid authorization header')
    )
    return
  }

  const idToken = authHeader.slice(7) // Remove 'Bearer ' prefix

  try {
    const decodedToken = await auth.verifyIdToken(idToken)
    
    // Extract custom claims for role and org
    const role = (decodedToken.role as UserRole) ?? 'readOnly'
    const orgId = (decodedToken.orgId as string) ?? 'default'
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role,
      orgId,
    }
    
    next()
  } catch (error) {
    console.error('Auth verification failed:', error)
    res.status(401).json(
      formatApiError(API_ERROR_CODES.UNAUTHORIZED, 'Invalid or expired token')
    )
  }
}

/**
 * Middleware to require a specific role (or higher)
 * Role hierarchy: admin > operator > readOnly
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(
        formatApiError(API_ERROR_CODES.UNAUTHORIZED, 'Not authenticated')
      )
      return
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json(
        formatApiError(API_ERROR_CODES.FORBIDDEN, 'Insufficient permissions')
      )
      return
    }

    next()
  }
}

/**
 * Optional auth - populates req.user if token is present, but doesn't require it
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization
  
  if (!authHeader?.startsWith('Bearer ')) {
    // No auth provided - continue without user info
    next()
    return
  }

  const idToken = authHeader.slice(7)

  try {
    const decodedToken = await auth.verifyIdToken(idToken)
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: (decodedToken.role as UserRole) ?? 'readOnly',
      orgId: (decodedToken.orgId as string) ?? 'default',
    }
  } catch {
    // Invalid token - continue without user info
  }
  
  next()
}

/**
 * Helper to get audit fields for create/update operations
 */
export function getAuditFields(req: AuthenticatedRequest, isCreate: boolean) {
  const now = new Date().toISOString()
  const userId = req.user?.uid ?? 'system'
  
  if (isCreate) {
    return {
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    }
  }
  
  return {
    updatedAt: now,
    updatedBy: userId,
  }
}
