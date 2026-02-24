import { useState } from 'react'
import { Calculator, ChevronDown, ChevronUp, DollarSign, GripVertical, Search } from 'lucide-react'
import LandedCostWidget from '../widgets/LandedCostWidget'
import SerialCheckWidget from '../widgets/SerialCheckWidget'
import EurToYenWidget from '../widgets/EurToYenWidget'
import CalculatorWidget from '../widgets/CalculatorWidget'

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

const SECTION_HEIGHT = {
  compact: 'max-h-[280px]',
  medium: 'max-h-[420px]',
  expanded: 'max-h-[620px]',
} as const

type SectionHeightMode = keyof typeof SECTION_HEIGHT

function heightLabel(mode: SectionHeightMode): string {
  switch (mode) {
    case 'compact':
      return 'Compact'
    case 'medium':
      return 'Medium'
    case 'expanded':
      return 'Expanded'
    default:
      return 'Medium'
  }
}

function renderWidget(widgetId: WidgetId) {
  switch (widgetId) {
    case 'landed-cost':
      return <LandedCostWidget />
    case 'serial-check':
      return <SerialCheckWidget />
    case 'fx-conversion':
      return <EurToYenWidget />
    case 'bid-calculator':
      return <CalculatorWidget />
    default:
      return null
  }
}

export default function SidecarWidgets() {
  const [order, setOrder] = useState<WidgetId[]>(['landed-cost', 'serial-check', 'fx-conversion', 'bid-calculator'])
  const [collapsed, setCollapsed] = useState<Record<WidgetId, boolean>>({
    'landed-cost': false,
    'serial-check': false,
    'fx-conversion': false,
    'bid-calculator': true,
  })
  const [heightMode, setHeightMode] = useState<Record<WidgetId, SectionHeightMode>>({
    'landed-cost': 'medium',
    'serial-check': 'medium',
    'fx-conversion': 'compact',
    'bid-calculator': 'expanded',
  })

  const moveWidget = (widgetId: WidgetId, direction: 'up' | 'down') => {
    setOrder((currentOrder) => {
      const currentIndex = currentOrder.indexOf(widgetId)
      if (currentIndex < 0) return currentOrder

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      if (swapIndex < 0 || swapIndex >= currentOrder.length) return currentOrder

      const nextOrder = [...currentOrder]
      const [target] = nextOrder.splice(currentIndex, 1)
      nextOrder.splice(swapIndex, 0, target)
      return nextOrder
    })
  }

  const cycleHeight = (widgetId: WidgetId) => {
    setHeightMode((current) => {
      const mode = current[widgetId]
      const nextMode: SectionHeightMode =
        mode === 'compact' ? 'medium' : mode === 'medium' ? 'expanded' : 'compact'
      return {
        ...current,
        [widgetId]: nextMode,
      }
    })
  }

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
          Reorder widgets, collapse sections, and cycle panel height to fit your sidecar workflow.
        </p>
      </div>

      <div className="space-y-3">
        {order.map((widgetId, index) => {
          const config = WIDGETS.find((widget) => widget.id === widgetId)
          if (!config) return null

          const Icon = config.icon
          const isCollapsed = collapsed[widgetId]
          const sizeMode = heightMode[widgetId]

          return (
            <section key={widgetId} className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-gray-500" />
                    <p className="truncate text-xs font-semibold text-gray-800">{config.title}</p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500">{config.description}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveWidget(widgetId, 'up')}
                    disabled={index === 0}
                    className="rounded-md border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Move widget up"
                    title="Move up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveWidget(widgetId, 'down')}
                    disabled={index === order.length - 1}
                    className="rounded-md border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
                    aria-label="Move widget down"
                    title="Move down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 px-3 py-1.5 text-[11px]">
                <div className="inline-flex items-center gap-1 text-gray-500">
                  <GripVertical className="h-3 w-3" />
                  {heightLabel(sizeMode)} height
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => cycleHeight(widgetId)}
                    className="rounded-md border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50"
                  >
                    Resize
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCollapsed(widgetId)}
                    className="rounded-md border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50"
                  >
                    {isCollapsed ? 'Expand' : 'Collapse'}
                  </button>
                </div>
              </div>

              {!isCollapsed && (
                <div className={`${SECTION_HEIGHT[sizeMode]} overflow-y-auto p-2`}>
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
