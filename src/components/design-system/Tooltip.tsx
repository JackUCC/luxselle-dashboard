import { useState, type ReactNode } from 'react'

export interface TooltipProps {
  content: string
  children: ReactNode
  /** Optional side for positioning */
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`absolute z-50 whitespace-nowrap rounded-lg bg-lux-900 px-2 py-1.5 text-ui-label text-white shadow-soft ${positionClasses[side]}`}
        >
          {content}
        </span>
      )}
    </span>
  )
}
