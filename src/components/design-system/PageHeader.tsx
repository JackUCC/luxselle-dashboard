import type { ReactNode } from 'react'

export interface PageHeaderProps {
  title: string
  purpose?: string
  actions?: ReactNode
}

export default function PageHeader({ title, purpose, actions }: PageHeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-page-title font-semibold italic text-lux-900">
            {title}
          </h1>
          {purpose ? (
            <p className="mt-0.5 text-body-sm text-lux-500">{purpose}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  )
}
