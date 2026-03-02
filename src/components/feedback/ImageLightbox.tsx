import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, X } from 'lucide-react'

interface ImageLightboxProps {
  isOpen: boolean
  imageUrl: string | null
  title?: string
  subtitle?: string
  sourceUrl?: string
  onClose: () => void
}

export default function ImageLightbox({
  isOpen,
  imageUrl,
  title,
  subtitle,
  sourceUrl,
  onClose,
}: ImageLightboxProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && imageUrl && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close image preview"
          />

          <motion.div
            className="relative w-full max-w-4xl overflow-hidden rounded-[20px] border border-white/20 bg-black/60 shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            role="dialog"
            aria-modal="true"
            aria-label={title ? `Image preview: ${title}` : 'Image preview'}
          >
            <div className="relative bg-black">
              <img src={imageUrl} alt={title ?? 'Preview'} className="max-h-[75vh] w-full object-contain" />
              <button
                type="button"
                onClick={onClose}
                className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white transition hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold/40"
                aria-label="Close image preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-start justify-between gap-3 border-t border-white/15 bg-black/50 px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{title ?? 'Comparable image'}</p>
                {subtitle && <p className="mt-0.5 text-xs text-white/75">{subtitle}</p>}
              </div>
              {sourceUrl && (
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-white/25 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold/40"
                >
                  Open source
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
