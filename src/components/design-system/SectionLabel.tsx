import type { ReactNode } from 'react'

interface SectionLabelProps {
  children: ReactNode
  className?: string
  as?: 'h2' | 'h3' | 'span'
  id?: string
}

export default function SectionLabel({
  children,
  className = '',
  as: Tag = 'h2',
  id,
}: SectionLabelProps) {
  return (
    <Tag
      id={id}
      className={`text-[13px] font-semibold uppercase tracking-[0.04em] text-lux-600 ${className}`.trim()}
    >
      {children}
    </Tag>
  )
}
