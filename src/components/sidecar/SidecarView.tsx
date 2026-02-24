import { useEffect, useMemo, useState } from 'react'
import { ArrowLeftToLine, Boxes, LayoutGrid, Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
    navigate('/')
  }

  return (
    <section className="space-y-2">
      <header className="sticky top-0 z-20">
        <div className="rounded-xl border border-gray-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-gray-900">Jarvis sidecar</h1>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Clean assistant view for live buying sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExitSidecar}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
              title="Exit sidecar and return to dashboard overview"
              aria-label="Exit sidecar and return to dashboard overview"
            >
              <ArrowLeftToLine className="h-3.5 w-3.5" />
              Exit
            </button>
          </div>

          <div className="mt-2 grid grid-cols-3 gap-1" aria-label="Sidecar assistant modes">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  aria-label={`${tab.label} mode`}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="mt-2 rounded-lg bg-gray-50 px-2 py-1.5 text-[11px] text-gray-600">
            {activeConfig.helper}
          </p>
        </div>
      </header>

      <div>
        {renderTabPanel(activeTab)}
      </div>
    </section>
  )
}
