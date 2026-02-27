import { useEffect, useRef, type ReactNode } from 'react'
import { useScrollLock } from '../../lib/useScrollLock'

export type DrawerPosition = 'left' | 'right' | 'bottom'

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  position?: DrawerPosition
  title?: string
  /** Optional id for aria-labelledby */
  titleId?: string
}

const positionClasses: Record<DrawerPosition, string> = {
  left: 'left-0 top-0 h-full w-full max-w-md animate-slide-right',
  right: 'right-0 top-0 h-full w-full max-w-md animate-slide-left',
  bottom: 'left-0 right-0 bottom-0 max-h-[85vh] rounded-t-lux-card animate-slide-up',
}

export default function Drawer({
  isOpen,
  onClose,
  children,
  position = 'right',
  title,
  titleId,
}: DrawerProps) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`fixed z-50 flex flex-col border-2 border-lux-200 border-l-0 bg-white shadow-float ${positionClasses[position]}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {title ? (
          <div className="flex items-center justify-between border-b border-lux-200 px-6 py-4">
            <h2 id={titleId} className="text-card-header font-semibold text-lux-900">
              {title}
            </h2>
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </>
  )
}
