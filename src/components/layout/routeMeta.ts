import {
  BarChart3,
  Calculator,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Globe,
  LayoutGrid,
  Package,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type AppNavSection = 'core' | 'tools'

export interface RouteMeta {
  path: string
  label: string
  navLabel: string
  icon: LucideIcon
  section: AppNavSection
}

export const appRoutes: RouteMeta[] = [
  // Core — daily workflow
  { path: '/', label: 'Overview', navLabel: 'Overview', icon: LayoutGrid, section: 'core' },
  { path: '/inventory', label: 'Inventory', navLabel: 'Inventory', icon: Package, section: 'core' },
  { path: '/buy-box', label: 'Buy Box', navLabel: 'Buy Box', icon: Calculator, section: 'core' },
  { path: '/sourcing', label: 'Sourcing', navLabel: 'Sourcing', icon: Users, section: 'core' },
  { path: '/buying-list', label: 'Buying List', navLabel: 'Buying List', icon: ClipboardList, section: 'core' },
  // Tools — supporting pages
  { path: '/market-research', label: 'Market Research', navLabel: 'Research', icon: BarChart3, section: 'tools' },
  { path: '/supplier-hub', label: 'Supplier Hub', navLabel: 'Supplier Hub', icon: Globe, section: 'tools' },
  { path: '/invoices', label: 'Invoices', navLabel: 'Invoices', icon: FileText, section: 'tools' },
  { path: '/jobs', label: 'Jobs', navLabel: 'Jobs', icon: FileSpreadsheet, section: 'tools' },
]

const formatLabel = (value: string) =>
  value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

export interface DeepStateRule {
  route: string
  keys: string[]
  toCrumbLabel: (params: URLSearchParams) => string[]
}

export const deepStateRules: DeepStateRule[] = [
  {
    route: '/inventory',
    keys: ['q', 'brand', 'status', 'lowStock', 'product'],
    toCrumbLabel: (params) => {
      const labels: string[] = []
      if (params.get('lowStock') === '1') labels.push('Low Stock')
      if (params.get('product')) labels.push('Product')
      const status = params.get('status')
      if (status) labels.push(formatLabel(status))
      if (!labels.length && params.get('brand')) labels.push('Brand Filter')
      if (!labels.length && params.get('q')) labels.push('Search')
      return labels
    },
  },
  {
    route: '/buy-box',
    keys: ['brand', 'model', 'category', 'condition', 'colour'],
    toCrumbLabel: () => ['Prefilled'],
  },
  {
    route: '/supplier-hub',
    keys: ['focus', 'supplier', 'brand', 'availability', 'importSupplier'],
    toCrumbLabel: (params) => {
      if (params.get('focus') === 'import') return ['Import Focus']
      if (params.get('importSupplier')) return ['Import Supplier']
      return ['Filtered']
    },
  },
  {
    route: '/sourcing',
    keys: ['status'],
    toCrumbLabel: (params) => {
      const status = params.get('status')
      if (!status || status === 'all') return []
      return [formatLabel(status)]
    },
  },
  {
    route: '/buying-list',
    keys: ['status', 'view'],
    toCrumbLabel: (params) => {
      const labels: string[] = []
      if (params.get('view') === 'bulk') labels.push('Bulk View')
      const status = params.get('status')
      if (status && status !== 'all') labels.push(formatLabel(status))
      return labels
    },
  },
  {
    route: '/jobs',
    keys: ['status', 'job'],
    toCrumbLabel: (params) => {
      const labels: string[] = []
      const status = params.get('status')
      if (status && status !== 'all') labels.push(formatLabel(status))
      if (params.get('job')) labels.push('Job')
      return labels
    },
  },
]

export const getRouteMeta = (pathname: string) => appRoutes.find((route) => route.path === pathname)

export const getDeepStateRule = (pathname: string) =>
  deepStateRules.find((rule) => rule.route === pathname)
