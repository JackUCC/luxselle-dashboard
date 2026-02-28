import React, { useEffect, useRef, useState } from 'react'
import { Star, Trash2, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { formatCurrency } from '../../lib/formatters'
import { RECOMMENDATION_CONFIG } from '../MarketResearch/MarketResearchResultPanel'
import type { SavedResearchItem } from './SavedResearchView'
import ConfirmationModal from '../../components/common/ConfirmationModal'

interface SavedResearchCardProps {
    item: SavedResearchItem
    index: number
    onToggleStar: (id: string, starred: boolean) => Promise<void>
    onDelete: (id: string) => Promise<void>
    onClick: (item: SavedResearchItem) => void
}

function getRelativeTime(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInDays === 0) return 'Today'
    if (diffInDays === 1) return 'Yesterday'
    
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    return rtf.format(-diffInDays, 'day')
}

export default function SavedResearchCard({
    item,
    index,
    onToggleStar,
    onDelete,
    onClick
}: SavedResearchCardProps) {
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [isStarring, setIsStarring] = useState(false)
    const [starScale, setStarScale] = useState(1)
    const hasMountedRef = useRef(false)

    const rec = RECOMMENDATION_CONFIG[item.result.recommendation] || RECOMMENDATION_CONFIG.hold

    useEffect(() => {
        if (!hasMountedRef.current) {
            hasMountedRef.current = true
            return
        }
        setStarScale(1.3)
        const frame = requestAnimationFrame(() => setStarScale(1))
        return () => cancelAnimationFrame(frame)
    }, [item.starred])

    const handleStarClick = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isStarring) return
        setIsStarring(true)
        try {
            await onToggleStar(item.id, !item.starred)
        } finally {
            setIsStarring(false)
        }
    }

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setShowDeleteConfirm(true)
    }

    const handleConfirmDelete = async () => {
        setIsDeleting(true)
        try {
            await onDelete(item.id)
            setShowDeleteConfirm(false)
        } catch {
            setIsDeleting(false)
        }
    }

    return (
        <>
            <motion.div
                layout
                initial={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden', marginTop: 0, marginBottom: 0, padding: 0 }}
                transition={{ duration: 0.3 }}
                className="animate-bento-enter"
                style={{ '--stagger': index } as React.CSSProperties}
            >
                <div 
                    className="lux-card group relative overflow-hidden transition-all cursor-pointer hover:shadow-md hover:border-lux-300 flex flex-col h-full focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                    onClick={() => onClick(item)}
                    tabIndex={0}
                >
                    {/* Header */}
                    <div className="p-5 flex items-start justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-lux-900 group-hover:text-lux-700 transition-colors">
                                {item.result.brand} {item.result.model}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-lux-400">
                                    {getRelativeTime(item.createdAt)}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-col gap-2 items-end shrink-0 z-10">
                            <motion.button
                                type="button"
                                onClick={handleStarClick}
                                disabled={isStarring}
                                animate={{ scale: starScale }}
                                transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                                className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-1.5 transition-transform duration-300 hover:bg-lux-50 active:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold/30 ${item.starred ? 'text-lux-gold' : 'text-lux-400 hover:text-lux-600'}`}
                                aria-label={item.starred ? "Remove star" : "Star item"}
                            >
                                <Star className={`h-5 w-5 ${item.starred ? 'fill-lux-gold' : ''}`} />
                            </motion.button>
                        </div>
                    </div>

                    {/* Middle content */}
                    <div className="px-5 pb-5 flex-1 flex flex-col justify-between">
                        <div className="mb-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${rec.bg} ${rec.color} ${rec.border}`}>
                                <span>{rec.icon}</span> {rec.label}
                            </span>
                        </div>
                        
                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-xs text-lux-400 uppercase tracking-widest mb-0.5">Market Value</p>
                                <p className="text-xl font-bold text-lux-900">
                                    {formatCurrency(item.result.estimatedMarketValueEur)}
                                </p>
                            </div>
                            
                            {/* Hover actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                    type="button"
                                    onClick={handleDeleteClick}
                                    className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 text-lux-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                                    aria-label="Delete saved research"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                                <div className="p-2 rounded-lg text-lux-400">
                                    <ChevronRight className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            <ConfirmationModal
                isOpen={showDeleteConfirm}
                onClose={() => !isDeleting && setShowDeleteConfirm(false)}
                onConfirm={handleConfirmDelete}
                title="Delete Saved Research"
                message={`Are you sure you want to delete the research for ${item.result.brand} ${item.result.model}?`}
                confirmLabel="Delete"
                variant="danger"
                isConfirming={isDeleting}
            />
        </>
    )
}
