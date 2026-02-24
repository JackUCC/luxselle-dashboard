import { useEffect, useState } from 'react'
import { Calculator, ChevronDown, ChevronUp, DollarSign, Search } from 'lucide-react'
import SidecarLandedCostWidget from './widgets/SidecarLandedCostWidget'
import SidecarSerialCheckWidget from './widgets/SidecarSerialCheckWidget'
import SidecarFxWidget from './widgets/SidecarFxWidget'
import SidecarBidWidget from './widgets/SidecarBidWidget'

type WidgetId = 'landed-cost' | 'serial-check' | 'fx-conversion' | 'bid-calculator'

interface WidgetCardConfig {
  id: WidgetId
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const WIDGETS: WidgetCardConfig[] = [
  {
    id: 'landed-cost',
    title: 'Landed cost + bid support',
    description: 'Quickly estimate landed pricing while scanning listings.',
    icon: Calculator,
  },
  {
    id: 'serial-check',
    title: 'Serial checker',
    description: 'Paste serial/date code and get the likely year.',
    icon: Search,
  },
  {
    id: 'fx-conversion',
    title: 'Conversion rate',
    description: 'Flip EUR/JPY with fresh rates while you evaluate.',
    icon: DollarSign,
  },
  {
    id: 'bid-calculator',
    title: 'Bid price calculator',
    description: 'Use target margin mode to calculate a safe max buy price.',
    icon: Calculator,
  },
]

function renderWidget(widgetId: WidgetId) {
  switch (widgetId) {
    case 'landed-cost':
      return <SidecarLandedCostWidget />
    case 'serial-check':
      return <SidecarSerialCheckWidget />
    case 'fx-conversion':
      return <SidecarFxWidget />
    case 'bid-calculator':
      return <SidecarBidWidget />
    default:
      return null
  }
}

const COLLAPSED_WIDGETS_STORAGE_KEY = 'luxselle-sidecar-collapsed-widgets'

function parseStoredCollapsedState(raw: string | null): Partial<Record<WidgetId, boolean>> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return {
      'landed-cost': Boolean(parsed['landed-cost']),
      'serial-check': Boolean(parsed['serial-check']),
      'fx-conversion': Boolean(parsed['fx-conversion']),
      'bid-calculator': Boolean(parsed['bid-calculator']),
    }
  } catch {
    return {}
  }
}

export default function SidecarWidgets() {
  const [collapsed, setCollapsed] = useState<Record<WidgetId, boolean>>({
    'landed-cost': true,
    'serial-check': true,
    'fx-conversion': true,
    'bid-calculator': true,
  })

  useEffect(() => {
    const stored = parseStoredCollapsedState(localStorage.getItem(COLLAPSED_WIDGETS_STORAGE_KEY))
    setCollapsed((current) => ({
      ...current,
      ...stored,
    }))
  }, [])

  useEffect(() => {
    localStorage.setItem(COLLAPSED_WIDGETS_STORAGE_KEY, JSON.stringify(collapsed))
  }, [collapsed])

  const toggleCollapsed = (widgetId: WidgetId) => {
    setCollapsed((current) => ({
      ...current,
      [widgetId]: !current[widgetId],
    }))
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <h2 className="text-xs font-semibold text-gray-800">Widget workspace</h2>
        <p className="mt-1 text-xs text-gray-500">
          Sidecar-native widgets designed for narrow vertical sessions. Expand only what you need.
        </p>
      </div>

      <div className="space-y-3">
        {WIDGETS.map((widget) => {
          const widgetId = widget.id
          const Icon = widget.icon
          const isCollapsed = collapsed[widgetId]

          return (
            <section key={widgetId} className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-start justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-gray-500" />
                    <p className="truncate text-xs font-semibold text-gray-800">{widget.title}</p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500">{widget.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleCollapsed(widgetId)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50"
                >
                  {isCollapsed ? (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      Expand
                    </>
                  ) : (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      Collapse
                    </>
                  )}
                </button>
              </div>

              {!isCollapsed && (
                <div className="border-t border-gray-100 p-2">
                  {renderWidget(widgetId)}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
