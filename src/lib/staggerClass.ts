const DEFAULT_MAX_STAGGER = 12

export function staggerClass(index: number, max = DEFAULT_MAX_STAGGER): string {
  const safeMax = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : DEFAULT_MAX_STAGGER
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0
  return `stagger-${Math.min(safeIndex, safeMax)}`
}
