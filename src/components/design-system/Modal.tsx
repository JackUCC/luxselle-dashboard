import { useEffect, type ReactNode } from 'react'

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
  useEffect(() => {
    if (!isOpen) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

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
        >
          {children}
        </div>
      </div>
    </>
  )
}
