import { useEffect, useState, useMemo } from 'react'
import { Bookmark, Star, Search, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PageLayout from '../../components/layout/PageLayout'
import { PageHeader, Button } from '../../components/design-system'
import { LuxSelect } from '../../components/design-system/Input'
import Drawer from '../../components/design-system/Drawer'
import { apiGet, apiDelete, apiPut } from '../../lib/api'
import type { MarketResearchResult } from '../MarketResearch/types'
import { AnimatePresence } from 'framer-motion'
import SavedResearchCard from './SavedResearchCard'
import MarketResearchResultPanel from '../MarketResearch/MarketResearchResultPanel'

export interface SavedResearchItem {
    id: string
    createdAt: string
    isStarred: boolean
    result: MarketResearchResult
}

export default function SavedResearchView() {
    const [items, setItems] = useState<SavedResearchItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'starred'>('all')
    const [brandFilter, setBrandFilter] = useState<string>('all')
    
    const [selectedItem, setSelectedItem] = useState<SavedResearchItem | null>(null)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setIsLoading(true)
            try {
                const { data } = await apiGet<{ data: SavedResearchItem[] }>('/saved-research')
                if (!cancelled) setItems(data || [])
            } catch (err) {
                console.error('Failed to load saved research', err)
                if (!cancelled) toast.error('Failed to load saved research')
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [])

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
            if (filter === 'starred' && !item.isStarred) return false
            if (brandFilter !== 'all' && item.result.brand !== brandFilter) return false
            return true
        })
    }, [items, filter, brandFilter])

    const handleToggleStar = async (id: string, isStarred: boolean) => {
        try {
            await apiPut(`/saved-research/${id}`, { isStarred })
            setItems(prev => prev.map(item => item.id === id ? { ...item, isStarred } : item))
            if (selectedItem?.id === id) {
                setSelectedItem(prev => prev ? { ...prev, isStarred } : prev)
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
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
                <div className="flex items-center gap-1 bg-lux-100 p-1 rounded-lg">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${filter === 'all' ? 'bg-white shadow-sm text-lux-900' : 'text-lux-600 hover:text-lux-800'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('starred')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${filter === 'starred' ? 'bg-white shadow-sm text-lux-900' : 'text-lux-600 hover:text-lux-800'}`}
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
                <div className="flex items-center justify-center min-h-[300px]">
                    <Loader2 className="h-8 w-8 animate-spin text-lux-300" />
                </div>
            ) : items.length === 0 ? (
                <div className="lux-card border-dashed border-2 min-h-[400px] flex flex-col items-center justify-center text-center p-6">
                    <div className="h-16 w-16 bg-lux-50 rounded-full flex items-center justify-center mb-4">
                        <Bookmark className="h-8 w-8 text-lux-400" />
                    </div>
                    <h3 className="text-lg font-medium text-lux-900 mb-1">No saved research yet</h3>
                    <p className="text-sm text-lux-500 max-w-sm">
                        Research an item in the Market Research tool and click Save to keep it here for quick reference.
                    </p>
                    <Button variant="primary" className="mt-6" onClick={() => window.location.href = '/market-research'}>
                        <Search className="h-4 w-4 mr-2" />
                        Go to Market Research
                    </Button>
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="lux-card border-dashed border-2 min-h-[300px] flex flex-col items-center justify-center text-center p-6">
                    <p className="text-lux-500">No matching research found for these filters.</p>
                    <Button variant="secondary" className="mt-4" onClick={() => { setFilter('all'); setBrandFilter('all'); }}>
                        Clear Filters
                    </Button>
                </div>
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

            <Drawer
                isOpen={!!selectedItem}
                onClose={() => setSelectedItem(null)}
                position="right"
                title={selectedItem ? `${selectedItem.result.brand} ${selectedItem.result.model}` : ''}
            >
                {selectedItem && (
                    <div className="pb-8">
                        <MarketResearchResultPanel result={selectedItem.result} />
                    </div>
                )}
            </Drawer>
        </PageLayout>
    )
}
