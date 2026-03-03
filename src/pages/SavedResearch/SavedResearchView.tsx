import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, Star, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import PageLayout from '../../components/layout/PageLayout'
import { PageHeader, Button, Card, EmptyState, Modal } from '../../components/design-system'
import { LuxSelect } from '../../components/design-system/Input'
import { apiGet, apiDelete, apiPut } from '../../lib/api'
import Skeleton from '../../components/feedback/Skeleton'
import type { MarketResearchResult } from '../MarketResearch/types'
import { AnimatePresence } from 'framer-motion'
import SavedResearchCard from './SavedResearchCard'
import MarketResearchResultPanel from '../MarketResearch/MarketResearchResultPanel'

export interface SavedResearchItem {
    id: string
    createdAt: string
    brand: string
    model: string
    category: string
    condition: string
    starred: boolean
    notes?: string
    result: MarketResearchResult
}

export default function SavedResearchView() {
    const navigate = useNavigate()
    const [items, setItems] = useState<SavedResearchItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [reloadKey, setReloadKey] = useState(0)
    const [filter, setFilter] = useState<'all' | 'starred'>('all')
    const [brandFilter, setBrandFilter] = useState<string>('all')
    
    const [selectedItem, setSelectedItem] = useState<SavedResearchItem | null>(null)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setIsLoading(true)
            try {
                const { data } = await apiGet<{ data: SavedResearchItem[] }>('/saved-research')
                if (!cancelled) {
                    setItems(data || [])
                    setError(null)
                }
            } catch (err) {
                console.error('Failed to load saved research', err)
                const message = err instanceof Error ? err.message : 'Failed to load saved research'
                if (!cancelled) {
                    setError(message)
                    toast.error(message)
                }
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [reloadKey])

    const uniqueBrands = useMemo(() => {
        const brands = new Set<string>()
        items.forEach(item => brands.add(item.result.brand))
        return Array.from(brands).sort()
    }, [items])

    const brandOptions = useMemo(() => {
        return [
            { value: 'all', label: 'All Brands' },
            ...uniqueBrands.map(b => ({ value: b, label: b }))
        ]
    }, [uniqueBrands])

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            if (filter === 'starred' && !item.starred) return false
            if (brandFilter !== 'all' && item.result.brand !== brandFilter) return false
            return true
        })
    }, [items, filter, brandFilter])

    const handleToggleStar = async (id: string, starred: boolean) => {
        try {
            await apiPut(`/saved-research/${id}`, { starred })
            setItems(prev => prev.map(item => item.id === id ? { ...item, starred } : item))
            if (selectedItem?.id === id) {
                setSelectedItem(prev => prev ? { ...prev, starred } : prev)
            }
        } catch (error) {
            toast.error('Failed to update item')
            throw error
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await apiDelete(`/saved-research/${id}`)
            setItems(prev => prev.filter(item => item.id !== id))
            if (selectedItem?.id === id) {
                setSelectedItem(null)
            }
            toast.success('Research deleted')
        } catch (error) {
            toast.error('Failed to delete research')
            throw error
        }
    }

    return (
        <PageLayout variant="content">
            <PageHeader
                title="Saved Research"
                purpose="View and manage your saved market research analysis."
            />
            
            {/* Filter Bar */}
            <div className="mb-6 flex flex-col items-stretch justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex w-full items-center gap-1 rounded-lg bg-lux-100 p-1 sm:w-auto">
                    <button
                        type="button"
                        onClick={() => setFilter('all')}
                        className={`min-h-[44px] rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none ${filter === 'all' ? 'bg-white shadow-sm text-lux-900' : 'text-lux-600 hover:text-lux-800'}`}
                    >
                        All
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('starred')}
                        className={`flex min-h-[44px] items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none ${filter === 'starred' ? 'bg-white shadow-sm text-lux-900' : 'text-lux-600 hover:text-lux-800'}`}
                    >
                        <Star className={`h-4 w-4 ${filter === 'starred' ? 'fill-lux-gold text-lux-gold' : ''}`} />
                        Starred
                    </button>
                </div>
                
                <div className="w-full sm:w-48">
                    <LuxSelect
                        id="brand-filter"
                        name="brandFilter"
                        value={brandFilter}
                        onValueChange={setBrandFilter}
                        options={brandOptions}
                        ariaLabel="Filter by brand"
                    />
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="lux-card p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-4 w-4" variant="circle" />
                            </div>
                            <Skeleton className="h-3 w-36" />
                            <Skeleton className="h-3 w-20" />
                            <div className="flex items-center gap-2 pt-1">
                                <Skeleton className="h-5 w-16 rounded-full" variant="rect" />
                                <Skeleton className="h-5 w-14 rounded-full" variant="rect" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <Card className="border-rose-200 bg-rose-50/60 p-6 text-center animate-bento-enter stagger-1">
                    <p className="text-sm font-medium text-rose-600">{error}</p>
                    <Button
                        variant="secondary"
                        className="mt-4"
                        onClick={() => setReloadKey((prev) => prev + 1)}
                    >
                        Retry
                    </Button>
                </Card>
            ) : items.length === 0 ? (
                <Card className="min-h-[400px] border-2 border-dashed animate-bento-enter stagger-1">
                    <EmptyState
                        icon={Bookmark}
                        title="No saved research yet"
                        description="Research an item in the Market Research tool and click Save to keep it here for quick reference."
                        action={(
                            <Button variant="primary" className="inline-flex items-center gap-2" onClick={() => navigate('/market-research')}>
                                <Search className="h-4 w-4" />
                                Go to Market Research
                            </Button>
                        )}
                    />
                </Card>
            ) : filteredItems.length === 0 ? (
                <Card className="min-h-[300px] border-2 border-dashed animate-bento-enter stagger-1">
                    <EmptyState
                        icon={Search}
                        title="No matching research found"
                        description="Try a different filter combination or clear filters."
                        action={(
                            <Button variant="secondary" onClick={() => { setFilter('all'); setBrandFilter('all'); }}>
                                Clear Filters
                            </Button>
                        )}
                    />
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredItems.map((item, index) => (
                            <SavedResearchCard
                                key={item.id}
                                item={item}
                                index={index}
                                onToggleStar={handleToggleStar}
                                onDelete={handleDelete}
                                onClick={setSelectedItem}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            )}

            <Modal
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                size="lg"
                titleId="saved-research-preview-title"
            >
                {selectedItem && (
                    <div className="flex max-h-[85vh] flex-col">
                        <div className="flex shrink-0 items-center justify-between border-b border-lux-200 px-6 py-4">
                            <h2 id="saved-research-preview-title" className="text-card-header font-semibold text-lux-900">
                                {selectedItem.result.brand} {selectedItem.result.model}
                            </h2>
                            <button
                                type="button"
                                className="rounded-lg p-1 text-lux-500 hover:bg-lux-100 hover:text-lux-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold/30"
                                onClick={() => setSelectedItem(null)}
                                aria-label="Close"
                            >
                                <X className="h-5 w-5" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto p-6">
                            <MarketResearchResultPanel result={selectedItem.result} />
                        </div>
                    </div>
                )}
            </Modal>
        </PageLayout>
    )
}
