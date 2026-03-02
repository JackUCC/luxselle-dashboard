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
    <div className="min-w-0 space-y-3">
      <div className="rounded-xl border border-lux-200 bg-gradient-to-r from-lux-50/80 via-white to-lux-50/80 px-3 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-lux-600">Tools</h2>
        <p className="mt-1 text-xs text-lux-500">
          Expand only what you need for the current listing.
        </p>
        <div className="mt-2 grid grid-cols-1 gap-1.5 min-[380px]:grid-cols-2">
          <span className="rounded-md border border-lux-200 bg-white px-2 py-1 text-[11px] font-medium text-lux-600">Landed Cost</span>
          <span className="rounded-md border border-lux-200 bg-white px-2 py-1 text-[11px] font-medium text-lux-600">Serial Check</span>
          <span className="rounded-md border border-lux-200 bg-white px-2 py-1 text-[11px] font-medium text-lux-600">FX Conversion</span>
          <span className="rounded-md border border-lux-200 bg-white px-2 py-1 text-[11px] font-medium text-lux-600">Bid Calculator</span>
        </div>
      </div>

      <div className="space-y-3">
        {WIDGETS.map((widget) => {
          const widgetId = widget.id
          const Icon = widget.icon
          const isCollapsed = collapsed[widgetId]
          const panelId = `sidecar-widget-${widgetId}`
          const titleId = `${panelId}-title`

          return (
            <section
              key={widgetId}
              className={`rounded-xl border border-lux-200 bg-white transition-shadow duration-200 ${!isCollapsed ? 'shadow-[0_8px_24px_rgba(15,23,42,0.08)]' : ''}`}
            >
              <div className="flex items-start justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-lux-50/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-lux-200 bg-lux-100 text-lux-700">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <p id={titleId} className="truncate text-xs font-semibold text-lux-800">{widget.title}</p>
                  </div>
                  <p className="mt-0.5 text-xs leading-5 text-lux-500">{widget.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleCollapsed(widgetId)}
                  aria-expanded={!isCollapsed}
                  aria-controls={panelId}
                  className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md px-1.5 text-lux-400 transition-colors hover:text-lux-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lux-gold/30 focus-visible:ring-offset-1"
                >
                  {isCollapsed ? (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
              <div
                id={panelId}
                role="region"
                aria-labelledby={titleId}
                className={`grid transition-[grid-template-rows] duration-[250ms] ease-out ${isCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
              >
                <div className="min-h-0 overflow-x-auto overflow-y-hidden">
                  <div className="bg-lux-50/35 p-2">
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
