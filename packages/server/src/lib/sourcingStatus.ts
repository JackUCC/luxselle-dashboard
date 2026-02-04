/**
 * Sourcing request status state machine: valid transitions and helpers.
 * Used by PUT /api/sourcing/:id to reject invalid status changes.
 * @see docs/CODE_REFERENCE.md
 * References: @shared/schemas (SourcingStatusSchema)
 */
import type { z } from 'zod'
import { SourcingStatusSchema } from '@shared/schemas'

export type SourcingStatus = z.infer<typeof SourcingStatusSchema>

/** Allowed next statuses from each current status (open → sourcing → sourced → fulfilled|lost). */
const ALLOWED: Record<SourcingStatus, SourcingStatus[]> = {
  open: ['sourcing'],
  sourcing: ['sourced'],
  sourced: ['fulfilled', 'lost'],
  fulfilled: [],
  lost: [],
}

export function isValidSourcingTransition(
  from: SourcingStatus,
  to: SourcingStatus
): boolean {
  if (from === to) return true
  return ALLOWED[from]?.includes(to) ?? false
}

export function getValidNextStatuses(from: SourcingStatus): SourcingStatus[] {
  return [...ALLOWED[from]]
}
