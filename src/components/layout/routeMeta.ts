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

export type AppNavSection = 'check' | 'manage' | 'finance' | 'tools'

export interface RouteMeta {
  path: string
  label: string
  navLabel: string
  icon: LucideIcon
  section: AppNavSection
}

export const appRoutes: RouteMeta[] = [
  // Main — Overview, Price Check, Serial Check
  { path: '/', label: 'Overview', navLabel: 'Overview', icon: LayoutGrid, section: 'check' },
  { path: '/buy-box', label: 'Price Check', navLabel: 'Price Check', icon: Calculator, section: 'check' },
  { path: '/serial-check', label: 'Serial Check', navLabel: 'Serial Check', icon: Search, section: 'check' },
  // Manage — Inventory, Sourcing, Jobs
  { path: '/inventory', label: 'Inventory', navLabel: 'Inventory', icon: Package, section: 'manage' },
  { path: '/sourcing', label: 'Sourcing', navLabel: 'Sourcing', icon: Users, section: 'manage' },
  { path: '/jobs', label: 'Jobs', navLabel: 'Jobs', icon: FileSpreadsheet, section: 'manage' },
  // Finance
  { path: '/invoices', label: 'Invoices', navLabel: 'Invoices', icon: FileText, section: 'finance' },
  // Tools — Market Research, Retail Price
  { path: '/market-research', label: 'Market Research', navLabel: 'Market Research', icon: BarChart3, section: 'tools' },
  { path: '/retail-price', label: 'Retail Price', navLabel: 'Retail Price', icon: Tag, section: 'tools' },
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
    keys: ['q', 'brand', 'status', 'product'],
    toCrumbLabel: (params) => {
      const labels: string[] = []
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
