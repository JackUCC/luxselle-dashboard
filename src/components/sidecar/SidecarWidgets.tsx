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
    description: 'Enter bid € to see landed cost including fees, customs, and VAT.',
    icon: Calculator,
  },
  {
    id: 'serial-check',
    title: 'Serial checker',
    description: 'Paste serial or date code for likely year and pricing context.',
    icon: Search,
  },
  {
    id: 'fx-conversion',
    title: 'Conversion rate',
    description: 'Convert between € and ¥ with live rates while you evaluate.',
    icon: DollarSign,
  },
  {
    id: 'bid-calculator',
    title: 'Bid price calculator',
    description: 'Target margin mode to calculate a safe max buy price.',
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

const INITIAL_COLLAPSED: Record<WidgetId, boolean> = {
  'landed-cost': false,
  'serial-check': true,
  'fx-conversion': true,
  'bid-calculator': true,
}

export default function SidecarWidgets() {
  const [collapsed, setCollapsed] = useState<Record<WidgetId, boolean>>(INITIAL_COLLAPSED)

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
    <div className="space-y-4 min-w-0">
      <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Tools — Expand only what you need</h2>
        <ul className="mt-1.5 space-y-1 text-[11px] text-gray-600 list-disc list-inside">
          <li><strong>Landed Cost:</strong> Enter bid € to see landed cost (fees, customs, VAT).</li>
          <li><strong>Serial Check:</strong> Paste serial/date code for likely year and pricing context.</li>
          <li><strong>FX:</strong> Convert between € and ¥ with live rates.</li>
          <li><strong>Bid Calculator:</strong> Target margin mode for safe max buy price.</li>
        </ul>
      </div>

      <div className="space-y-4">
        {WIDGETS.map((widget) => {
          const widgetId = widget.id
          const Icon = widget.icon
          const isCollapsed = collapsed[widgetId]
          const panelId = `sidecar-widget-${widgetId}`

          return (
            <section
              key={widgetId}
              className={`rounded-xl border border-gray-200 bg-white transition-shadow duration-200 ${!isCollapsed ? 'shadow-sm' : ''}`}
            >
              <div className="flex items-start justify-between gap-2 px-3 py-2 border-l-2 border-l-indigo-200 hover:bg-gray-50/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <p className="truncate text-xs font-semibold text-gray-800">{widget.title}</p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500">{widget.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleCollapsed(widgetId)}
                  aria-expanded={!isCollapsed}
                  aria-controls={panelId}
                  className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-gray-200 px-2.5 py-1.5 min-h-[32px] text-[11px] font-medium text-gray-600 hover:bg-gray-100 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:ring-offset-1 transition-colors"
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
              <div
                id={panelId}
                role="region"
                className={`grid transition-[grid-template-rows] duration-200 ease-out ${isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
              >
                <div className="min-h-0 overflow-x-auto overflow-y-hidden">
                  <div className="border-t border-gray-100 p-2">
                    {renderWidget(widgetId)}
                  </div>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
