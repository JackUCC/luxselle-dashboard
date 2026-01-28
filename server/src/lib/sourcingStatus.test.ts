import { describe, it, expect } from 'vitest'
import {
  isValidSourcingTransition,
  getValidNextStatuses,
} from './sourcingStatus'

describe('sourcing status transitions', () => {
  it('allows open -> sourcing', () => {
    expect(isValidSourcingTransition('open', 'sourcing')).toBe(true)
  })

  it('allows sourcing -> sourced', () => {
    expect(isValidSourcingTransition('sourcing', 'sourced')).toBe(true)
  })

  it('allows sourced -> fulfilled', () => {
    expect(isValidSourcingTransition('sourced', 'fulfilled')).toBe(true)
  })

  it('allows sourced -> lost', () => {
    expect(isValidSourcingTransition('sourced', 'lost')).toBe(true)
  })

  it('allows same status (no-op)', () => {
    expect(isValidSourcingTransition('open', 'open')).toBe(true)
    expect(isValidSourcingTransition('sourced', 'sourced')).toBe(true)
  })

  it('rejects open -> fulfilled', () => {
    expect(isValidSourcingTransition('open', 'fulfilled')).toBe(false)
  })

  it('rejects open -> sourced', () => {
    expect(isValidSourcingTransition('open', 'sourced')).toBe(false)
  })

  it('rejects sourcing -> open', () => {
    expect(isValidSourcingTransition('sourcing', 'open')).toBe(false)
  })

  it('rejects sourcing -> fulfilled', () => {
    expect(isValidSourcingTransition('sourcing', 'fulfilled')).toBe(false)
  })

  it('rejects fulfilled -> sourced', () => {
    expect(isValidSourcingTransition('fulfilled', 'sourced')).toBe(false)
  })

  it('rejects lost -> open', () => {
    expect(isValidSourcingTransition('lost', 'open')).toBe(false)
  })

  it('getValidNextStatuses returns allowed next states', () => {
    expect(getValidNextStatuses('open')).toEqual(['sourcing'])
    expect(getValidNextStatuses('sourcing')).toEqual(['sourced'])
    expect(getValidNextStatuses('sourced')).toEqual(['fulfilled', 'lost'])
    expect(getValidNextStatuses('fulfilled')).toEqual([])
    expect(getValidNextStatuses('lost')).toEqual([])
  })
})
