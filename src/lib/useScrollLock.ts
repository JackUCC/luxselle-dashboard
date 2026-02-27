import { useEffect } from 'react'

let lockCount = 0
let savedOverflow = ''

function lock() {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }
  lockCount++
}

function unlock() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow
  }
}

/**
 * Ref-counted body scroll lock. Multiple overlays can call this simultaneously;
 * body overflow is only restored when the last one unmounts / becomes inactive.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    lock()
    return unlock
  }, [active])
}
