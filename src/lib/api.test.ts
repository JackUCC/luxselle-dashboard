import { describe, expect, it } from 'vitest'
import { normalizeApiBase } from './api'

describe('normalizeApiBase', () => {
  it('defaults to /api when env variable is missing or empty', () => {
    expect(normalizeApiBase(undefined)).toBe('/api')
    expect(normalizeApiBase('')).toBe('/api')
    expect(normalizeApiBase('   ')).toBe('/api')
  })

  it('normalizes absolute backend origin values', () => {
    expect(normalizeApiBase('https://backend.example.com')).toBe('https://backend.example.com/api')
    expect(normalizeApiBase('https://backend.example.com/')).toBe('https://backend.example.com/api')
    expect(normalizeApiBase('https://backend.example.com/api')).toBe('https://backend.example.com/api')
    expect(normalizeApiBase('https://backend.example.com/api/')).toBe('https://backend.example.com/api')
  })

  it('normalizes relative API base values', () => {
    expect(normalizeApiBase('/api')).toBe('/api')
    expect(normalizeApiBase('/api/')).toBe('/api')
    expect(normalizeApiBase('/backend')).toBe('/backend/api')
    expect(normalizeApiBase('/backend/')).toBe('/backend/api')
    expect(normalizeApiBase('api')).toBe('api/api')
  })
})
