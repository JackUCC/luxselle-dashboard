/**
 * Standard API error shape and codes used by all routes and error middleware.
 * Response format: { error: { code, message, details? } }.
 * @see docs/CODE_REFERENCE.md
 */
// Canonical codes returned in API error responses; used by routes and error middleware
export const API_ERROR_CODES = {
  VALIDATION: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
} as const

// Builds the standard JSON error body: { error: { code, message, details? } }
export function formatApiError(
  code: string,
  message: string,
  details?: object
): { error: { code: string; message: string; details?: object } } {
  return { error: details ? { code, message, details } : { code, message } }
}
