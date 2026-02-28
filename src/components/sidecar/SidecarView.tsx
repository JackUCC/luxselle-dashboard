import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftToLine, Boxes, LayoutGrid, Search } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getExitSidecarPath } from '../../lib/LayoutModeContext'
import QuickCheck from './QuickCheck'
import BatchProcessor from './BatchProcessor'
import SidecarWidgets from './SidecarWidgets'

type SidecarTab = 'quick' | 'batch' | 'widgets'

interface TabConfig {
  id: SidecarTab
  label: string
  helper: string
  icon: React.ComponentType<{ className?: string }>
}

const TABS: TabConfig[] = [
  { id: 'quick', label: 'Quick', helper: 'Single item checks with instant report and landed math.', icon: Search },
  { id: 'batch', label: 'Batch', helper: 'Paste many descriptions, queue them, then process in one run.', icon: LayoutGrid },
  { id: 'widgets', label: 'Tools', helper: 'Compact calculators and checks designed for narrow sidecar width.', icon: Boxes },
]

const ACTIVE_TAB_STORAGE_KEY = 'luxselle-sidecar-active-tab'

function isSidecarTab(value: string): value is SidecarTab {
  return value === 'quick' || value === 'batch' || value === 'widgets'
}

function resolveInitialTab(initialTab: SidecarTab): SidecarTab {
  try {
    const saved = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)
    if (saved && isSidecarTab(saved)) return saved
  } catch {
    // Ignore localStorage read errors in private mode or restricted contexts.
  }
  return initialTab
}

function renderTabPanel(tab: SidecarTab) {
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

export default function SidecarView({ initialTab = 'quick' }: { initialTab?: SidecarTab }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<SidecarTab>(() => resolveInitialTab(initialTab))

  const activeConfig = useMemo(
    () => TABS.find((tab) => tab.id === activeTab) ?? TABS[0],
    [activeTab]
  )

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab)
    } catch {
      // Ignore localStorage write errors in restricted environments.
    }
  }, [activeTab])

  const handleExitSidecar = () => {
    navigate(getExitSidecarPath('/', location.search), { replace: true })
  }

  return (
    <section className="min-w-0 max-w-full space-y-2">
      <header className="sticky top-0 z-20">
        <div className="rounded-lg border border-lux-200 bg-white p-2 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xs font-semibold text-lux-800">Sidecar</h1>
              <p className="mt-0.5 text-xs text-lux-400 break-words">
                Compact assistant for live buying sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExitSidecar}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-lux-200 px-2 py-1 text-xs font-medium text-lux-600 transition-colors hover:bg-lux-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
              title="Exit sidecar and return to overview"
              aria-label="Exit sidecar and return to overview"
            >
              <ArrowLeftToLine className="h-3 w-3" />
              Exit
            </button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1 min-w-0" aria-label="Sidecar assistant modes">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  aria-label={`${tab.label} mode`}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-md px-2 py-1.5 text-xs font-medium transition-colors min-w-0 truncate focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none ${
                    isActive
                      ? 'bg-lux-800 text-white'
                      : 'text-lux-500 hover:bg-lux-50 hover:text-lux-800'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-1 min-w-0">
                    <Icon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{tab.label}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <p className="mt-1.5 rounded-md bg-lux-50 px-2 py-1 text-xs text-lux-500 break-words">
            {activeConfig.helper}
          </p>
        </div>
      </header>

      <div className="min-w-0 max-w-full">
        {renderTabPanel(activeTab)}
      </div>
    </section>
  )
}
