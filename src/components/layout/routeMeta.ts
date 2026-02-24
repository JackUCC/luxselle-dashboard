import {
  BarChart3,
  Calculator,
  FileSpreadsheet,
  FileText,
  LayoutGrid,
  Package,
  Search,
  Tag,
  Users,
  type LucideIcon,
} from 'lucide-react'

export type AppNavSection = 'main' | 'admin' | 'extra'

export interface RouteMeta {
  path: string
  label: string
  navLabel: string
  icon: LucideIcon
  section: AppNavSection
}

export const appRoutes: RouteMeta[] = [
  // Main — Overview, Price Check, Serial Check
  { path: '/', label: 'Overview', navLabel: 'Overview', icon: LayoutGrid, section: 'main' },
  { path: '/buy-box', label: 'Price Check', navLabel: 'Price Check', icon: Calculator, section: 'main' },
  { path: '/serial-check', label: 'Serial Check', navLabel: 'Serial Check', icon: Search, section: 'main' },
  // Admin tools — Inventory, Sourcing, Jobs
  { path: '/inventory', label: 'Inventory', navLabel: 'Inventory', icon: Package, section: 'admin' },
  { path: '/sourcing', label: 'Sourcing', navLabel: 'Sourcing', icon: Users, section: 'admin' },
  { path: '/jobs', label: 'Jobs', navLabel: 'Jobs', icon: FileSpreadsheet, section: 'admin' },
  // Extra tools — Market Research, Retail price
  { path: '/market-research', label: 'Market Research', navLabel: 'Research', icon: BarChart3, section: 'extra' },
  { path: '/retail-price', label: 'What was this retail?', navLabel: 'Retail price', icon: Tag, section: 'extra' },
  { path: '/invoices', label: 'Invoices', navLabel: 'Invoices', icon: FileText, section: 'extra' },
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
    route: '/sourcing',
    keys: ['status'],
    toCrumbLabel: (params) => {
      const status = params.get('status')
      if (!status || status === 'all') return []
      return [formatLabel(status)]
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
