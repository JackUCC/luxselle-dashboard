export const API_ERROR_CODES = {
  VALIDATION: 'VALIDATION_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL_ERROR',
} as const

export function formatApiError(
  code: string,
  message: string,
  details?: object
): { error: { code: string; message: string; details?: object } } {
  return { error: details ? { code, message, details } : { code, message } }
}
