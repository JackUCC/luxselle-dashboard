import { forwardRef, type CSSProperties, type ReactNode } from 'react'
import Card from './Card'

interface TableShellProps {
  children: ReactNode
  className?: string
  tableClassName?: string
  cardClassName?: string
  style?: CSSProperties
  asCard?: boolean
}

const TableShell = forwardRef<HTMLDivElement, TableShellProps>(function TableShell(
  {
    children,
    className = '',
    tableClassName = '',
    cardClassName = '',
    style,
    asCard = true,
  },
  ref,
) {
  const content = (
    <div ref={ref} className={['overflow-x-auto', className].join(' ')} style={style}>
      <table className={['w-full', tableClassName].join(' ')}>
        {children}
      </table>
    </div>
  )

  if (!asCard) {
    return content
  }

  return <Card className={cardClassName}>{content}</Card>
})

export default TableShell
