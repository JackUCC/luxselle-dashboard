import { useEffect, useMemo, useState } from 'react'
import { LayoutGroup, motion } from 'framer-motion'
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
    navigate(getExitSidecarPath(location.pathname, location.search), { replace: true })
  }

  return (
    <section className="min-w-0 max-w-full space-y-3 overflow-x-clip">
      <header className="sticky top-0 z-20">
        <div className="overflow-x-clip rounded-xl border border-lux-200 bg-gradient-to-b from-white to-lux-50/80 p-2.5 shadow-[0_8px_20px_rgba(15,23,42,0.07)]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-lux-800">Sidecar</h1>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              </div>
              <p className="mt-0.5 text-xs leading-5 text-lux-500 break-words">
                Compact intelligence workspace for live buying sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExitSidecar}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-lux-200 bg-white px-2 py-1.5 text-xs font-semibold text-lux-700 transition-all hover:-translate-y-0.5 hover:border-lux-300 hover:bg-lux-50 focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
              title="Exit sidecar and return to overview"
              aria-label="Exit sidecar and return to overview"
            >
              <ArrowLeftToLine className="h-3 w-3" />
              Exit
            </button>
          </div>

          <LayoutGroup>
            <div className="mt-2 rounded-lg bg-lux-100 p-1" aria-label="Sidecar assistant modes">
              <div className="grid min-w-0 grid-cols-3 gap-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      aria-label={`${tab.label} mode`}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className="relative min-w-0 overflow-hidden rounded-md px-2 py-1.5 text-xs font-semibold text-lux-600 transition-colors focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:outline-none"
                    >
                      {isActive ? (
                        <motion.span
                          layoutId="sidecar-active-tab"
                          className="absolute inset-0 rounded-md border border-lux-200 bg-white shadow-xs"
                          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        />
                      ) : null}
                      <span className="relative z-10 inline-flex items-center justify-center gap-1 min-w-0">
                        <Icon className={`h-3 w-3 shrink-0 ${isActive ? 'text-lux-800' : 'text-lux-500'}`} />
                        <span className={`truncate ${isActive ? 'text-lux-800' : 'text-lux-500'}`}>{tab.label}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </LayoutGroup>

          <p className="mt-2 rounded-lg border border-lux-100 bg-white/90 px-2.5 py-1.5 text-xs leading-5 text-lux-600 break-words">
            {activeConfig.helper}
          </p>
        </div>
      </header>

      <div className="min-w-0 max-w-full overflow-x-clip">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabPanel(activeTab)}
        </motion.div>
      </div>
    </section>
  )
}
