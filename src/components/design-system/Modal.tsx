import { useEffect, useRef, type ReactNode } from 'react'
import { useScrollLock } from '../../lib/useScrollLock'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  /** Optional id for aria-labelledby */
  titleId?: string
  /** max-width: 24rem standard, 32rem for confirmation */
  size?: 'sm' | 'md'
}

export default function Modal({
  isOpen,
  onClose,
  children,
  titleId,
  size = 'sm',
}: ModalProps) {
  const onCloseRef = useRef(onClose)
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  onCloseRef.current = onClose

  useScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null

    const panel = panelRef.current
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')

    const getFocusable = () =>
      panel ? Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector)) : []

    const focusableOnOpen = getFocusable()
    ;(focusableOnOpen[0] ?? panel)?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }

      if (event.key !== 'Tab') return

      const focusable = getFocusable()
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      if (event.shiftKey && active === first) {
        event.preventDefault()
        last.focus()
        return
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const maxW = size === 'md' ? 'max-w-md' : 'max-w-sm'

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div
          className={`w-full overflow-hidden rounded-lux-modal border-2 border-lux-200 bg-white shadow-float ${maxW} animate-scale-in`}
          onClick={(e) => e.stopPropagation()}
          ref={panelRef}
          tabIndex={-1}
        >
          {children}
        </div>
      </div>
    </>
  )
}
