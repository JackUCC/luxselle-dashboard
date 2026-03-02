import { useEffect, useRef, useState } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { IconButton } from '../../components/design-system'
import type { ProductWithId } from '../../types/dashboard'

interface InventoryRowActionsProps {
  product: ProductWithId
  onEdit: () => void
  onDelete: () => void
}

export default function InventoryRowActions({
  product,
  onEdit,
  onDelete,
}: InventoryRowActionsProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const openRef = useRef(open)
  openRef.current = open

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (openRef.current && ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <IconButton
        icon={<MoreVertical className="h-4 w-4" />}
        label={`Row actions for ${product.brand} ${product.model}`}
        size="md"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((value) => !value)
        }}
        className="text-lux-400 hover:text-lux-600"
      />
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded-lux-card border border-lux-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-lux-700 hover:bg-lux-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
