/**
 * API client: apiGet, apiPost, apiPut, apiDelete, apiPostFormData; base /api; ApiError with status.
 * Parses backend error shape { error: { code, message, details? } } for user-facing messages.
 * @see docs/CODE_REFERENCE.md
 * References: Fetch API
 */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const API_BASE = '/api'

interface ApiErrorBody {
  error?: { code?: string; message?: string; details?: unknown }
}

/** Extract user-facing message from API error JSON or response text. */
async function getErrorMessage(response: Response): Promise<string> {
  const text = await response.text()
  try {
    const json = JSON.parse(text) as ApiErrorBody
    if (json.error?.message) return json.error.message
  } catch {
    // ignore
  }
  return text || 'Request failed'
}

/** Shared fetch wrapper: throws ApiError on !ok; returns JSON or undefined for 204. */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, options)
  if (!response.ok) {
    const message = await getErrorMessage(response)
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function apiGet<T>(path: string) {
  return request<T>(path)
}

export function apiPost<T>(path: string, body: unknown) {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function apiPut<T>(path: string, body: unknown) {
  return request<T>(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function apiDelete(path: string) {
  return request<undefined>(path, { method: 'DELETE' })
}

/**
 * POST request with FormData (for file uploads)
 */
export async function apiPostFormData<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) {
    const message = await getErrorMessage(response)
    throw new ApiError(message, response.status)
  }
  return response.json() as Promise<T>
}
