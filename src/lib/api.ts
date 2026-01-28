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
