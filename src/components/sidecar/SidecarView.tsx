import { useState } from 'react'
import { Boxes, LayoutGrid, Search } from 'lucide-react'
import QuickCheck from './QuickCheck'
import BatchProcessor from './BatchProcessor'
import SidecarWidgets from './SidecarWidgets'

type SidecarTab = 'quick' | 'batch' | 'widgets'

interface TabConfig {
  id: SidecarTab
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: TabConfig[] = [
  { id: 'quick', label: 'Quick check', icon: Search },
  { id: 'batch', label: 'Batch', icon: LayoutGrid },
  { id: 'widgets', label: 'Widgets', icon: Boxes },
]

function renderTab(tab: SidecarTab) {
  switch (tab) {
    case 'quick':
      return <QuickCheck />
    case 'batch':
      return <BatchProcessor />
    case 'widgets':
      return <SidecarWidgets />
    default:
      return <QuickCheck />
  }
}

export default function SidecarView() {
  const [activeTab, setActiveTab] = useState<SidecarTab>('quick')

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <h1 className="text-sm font-bold text-gray-900">Supplier Engine Sidecar</h1>
        <p className="mt-1 text-xs text-gray-500">
          Switch between one-by-one checks, batch workflow, or widget workspace.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-xl border border-gray-200 bg-white p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>

      {renderTab(activeTab)}
    </section>
  )
}
