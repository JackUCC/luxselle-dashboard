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
      className={`text-[12px] font-semibold uppercase tracking-[0.06em] text-lux-400 ${className}`.trim()}
    >
      {children}
    </Tag>
  )
}
