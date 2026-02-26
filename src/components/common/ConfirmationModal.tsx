import React from 'react'
import { Loader2, AlertTriangle, X } from 'lucide-react'

import Modal from '../design-system/Modal'
import Button from '../design-system/Button'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isConfirming?: boolean
  variant?: 'danger' | 'warning' | 'info'
}

const variantStyles = {
  danger: {
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    confirmClass: 'lux-btn-primary bg-rose-600 hover:bg-rose-700 border-rose-600',
  },
  warning: {
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmClass: 'lux-btn-primary bg-amber-600 hover:bg-amber-700 border-amber-600',
  },
  info: {
    iconBg: 'bg-lux-200',
    iconColor: 'text-lux-700',
    confirmClass: 'lux-btn-primary',
  },
} as const

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isConfirming = false,
  variant = 'danger',
}: ConfirmationModalProps) {
  const styles = variantStyles[variant]
  const Icon = AlertTriangle
  const titleId = 'confirmation-modal-title'

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" titleId={titleId}>
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}
          >
            <Icon className={`h-5 w-5 ${styles.iconColor}`} aria-hidden="true" />
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-lux-500 hover:bg-lux-100 hover:text-lux-700 focus:outline-none focus:ring-2 focus:ring-lux-gold"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4">
          <h3
            id={titleId}
            className="text-card-header font-semibold text-lux-900"
          >
            {title}
          </h3>
          <p className="mt-2 text-body-sm text-lux-600">{message}</p>
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-lux-200 bg-lux-50 px-6 py-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={isConfirming}>
          {cancelLabel}
        </Button>
        <button
          type="button"
          className={`${styles.confirmClass} inline-flex min-h-[40px] min-w-[24px] items-center justify-center rounded-lux-input px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-lux-gold focus:ring-offset-2 disabled:opacity-50`}
          onClick={onConfirm}
          disabled={isConfirming}
        >
          {isConfirming ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            confirmLabel
          )}
        </button>
      </div>
    </Modal>
  )
}
