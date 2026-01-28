import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  DollarSign, 
  ClipboardList, 
  Users, 
  AlertCircle,
  Globe,
  Zap,
  Activity,
  Package,
  Calculator,
  User
} from 'lucide-react'
import type { ActivityEvent } from '@shared/schemas'
import { apiGet } from '../../lib/api'
import CommandBar from './CommandBar'

type ActivityEventWithId = ActivityEvent & { id: string }

interface KPIs {
  totalInventoryValue: number
  pendingBuyListValue: number
  activeSourcingPipeline: number
  lowStockAlerts: number
}

interface SystemStatus {
  aiProvider: string
  firebaseMode: string
  lastSupplierImport: {
    status: string
    lastRunAt?: string
    lastError?: string
  } | null
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))} mins ago`
  }
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))} hours ago`
  }
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

export default function DashboardView() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [activity, setActivity] = useState<ActivityEventWithId[]>([])
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [kpisRes, activityRes, statusRes] = await Promise.all([
        apiGet<{ data: KPIs }>('/dashboard/kpis'),
        apiGet<{ data: ActivityEventWithId[] }>('/dashboard/activity?limit=5'),
        apiGet<{ data: SystemStatus }>('/dashboard/status'),
      ])
      setKpis(kpisRes.data)
      setActivity(activityRes.data)
      setStatus(statusRes.data)
      setError(null)
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load dashboard'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const getEventDescription = (event: ActivityEventWithId) => {
    const p = event.payload as Record<string, unknown>
    const str = (key: string) => (p?.[key] != null ? String(p[key]) : '')
    
    switch (event.eventType) {
      case 'product_created':
        return (
          <span>Added <span className="font-medium text-gray-900">{str('brand')} {str('model')}</span> to inventory</span>
        )
      case 'buylist_added':
        return (
          <span>Added to buying list: <span className="font-medium text-gray-900">{str('brand')} {str('model')}</span></span>
        )
      case 'buylist_received':
        return (
          <span>Received stock: <span className="font-medium text-gray-900">{str('brand')} {str('model')}</span></span>
        )
      case 'supplier_import':
        return (
          <span>Supplier import completed: <span className="font-medium text-gray-900">{p?.success ?? 0} items</span></span>
        )
      case 'sourcing_created':
        return (
          <span>New request from <span className="font-medium text-gray-900">{str('customerName')}</span></span>
        )
      case 'sourcing_status_changed':
        return (
          <span>Sourcing update for <span className="font-medium text-gray-900">{str('customerName')}</span></span>
        )
      case 'seed':
        return <span>System database seeded</span>
      default:
        return <span>{event.eventType}</span>
    }
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'product_created':
      case 'buylist_received':
        return 'bg-green-100 text-green-600'
      case 'sourcing_created':
      case 'sourcing_status_changed':
        return 'bg-purple-100 text-purple-600'
      case 'supplier_import':
        return 'bg-blue-100 text-blue-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="flex flex-col items-center space-y-12 py-8">
      {/* Hero Section */}
      <div className="w-full max-w-2xl text-center space-y-8">
        <h1 className="text-4xl font-display font-bold text-gray-900">
          Good afternoon, Jack
        </h1>
        
        <div className="w-full">
          <CommandBar />
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <Link 
            to="/inventory"
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Package className="h-4 w-4" />
            View Stock
          </Link>
          <Link 
            to="/buy-box"
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Calculator className="h-4 w-4" />
            Evaluate Item
          </Link>
          <Link 
            to="/sourcing"
            className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <User className="h-4 w-4" />
            Sourcing List
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="w-full text-center py-12 text-gray-400">Loading dashboard data...</div>
      ) : error ? (
        <div className="w-full max-w-4xl rounded-lg bg-red-50 p-4 text-center text-red-600">{error}</div>
      ) : (
        <div className="w-full space-y-8">
          {/* KPIs */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lux-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                  <DollarSign className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                  +12%
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {kpis ? formatCurrency(kpis.totalInventoryValue) : '—'}
              </div>
              <div className="text-sm text-gray-500">Total Inventory Value</div>
            </div>

            <div className="lux-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="rounded-lg bg-pink-50 p-2 text-pink-600">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                  2 Items
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {kpis ? formatCurrency(kpis.pendingBuyListValue) : '—'}
              </div>
              <div className="text-sm text-gray-500">Pending Buy List</div>
            </div>

            <div className="lux-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
                  <Users className="h-5 w-5" />
                </div>
                <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700">
                  1 Open
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {kpis ? formatCurrency(kpis.activeSourcingPipeline) : '—'}
              </div>
              <div className="text-sm text-gray-500">Active Sourcing Pipeline</div>
            </div>

            <div className="lux-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {kpis ? kpis.lowStockAlerts : '—'}
              </div>
              <div className="text-sm text-gray-500">Low Stock Alerts</div>
            </div>
          </div>

          {/* Activity & Status Grid */}
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Recent Activity */}
            <div className="lg:col-span-2 lux-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="h-5 w-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900 uppercase tracking-wider text-xs">Recent Activity</h3>
              </div>
              
              <div className="space-y-6">
                {activity.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent activity</p>
                ) : (
                  activity.map((event) => (
                    <div key={event.id} className="flex gap-4">
                      <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                        getEventIcon(event.eventType).split(' ')[1].replace('text-', 'bg-')
                      }`} />
                      <div className="flex-1 space-y-1">
                        <div className="text-sm text-gray-600">
                          {getEventDescription(event)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(event.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* System Status */}
            <div className="rounded-xl bg-gray-900 p-6 text-white shadow-soft-lg">
              <h3 className="font-display font-bold text-lg mb-1">System Status</h3>
              <p className="text-sm text-gray-400 mb-6">All systems operational.</p>

              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Globe className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">Supplier Feeds</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-xs font-medium text-emerald-500">Live</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">AI Engine</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-xs font-medium text-emerald-500">Ready</span>
                  </div>
                </div>
              </div>

              <button className="mt-6 w-full rounded-lg bg-gray-800 py-3 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
                Run Diagnostics
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
