/**
 * VAT calculation helpers: net ↔ gross with a given rate.
 * Used by VAT API and invoice creation. Rate is percentage (e.g. 20 for 20%).
 * @see docs/CODE_REFERENCE.md
 */

/** VAT amount and gross from a net amount: vatEur = net * (rate/100), gross = net + vatEur */
export function vatFromNet(netEur: number, ratePct: number): { vatEur: number; grossEur: number } {
  const vatEur = Math.round((netEur * (ratePct / 100)) * 100) / 100
  return { vatEur, grossEur: netEur + vatEur }
}

/** Net and VAT from a gross amount: net = gross / (1 + rate/100), vatEur = gross - net */
export function vatFromGross(grossEur: number, ratePct: number): { netEur: number; vatEur: number } {
  const netEur = Math.round((grossEur / (1 + ratePct / 100)) * 100) / 100
  const vatEur = Math.round((grossEur - netEur) * 100) / 100
  return { netEur, vatEur }
}
