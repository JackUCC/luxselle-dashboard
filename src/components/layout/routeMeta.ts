import {
  Box,
  CircleDollarSign,
  Globe,
  House,
  Receipt,
  ScanLine,
  Tags,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'

export type AppNavSection = 'check' | 'manage'

export interface RouteMeta {
  path: string
  label: string
  navLabel: string
  icon: LucideIcon
  section: AppNavSection
}

export const appRoutes: RouteMeta[] = [
  { path: '/', label: 'Overview', navLabel: 'Overview', icon: House, section: 'check' },
  { path: '/buy-box', label: 'Price Check', navLabel: 'Price Check', icon: CircleDollarSign, section: 'check' },
  { path: '/retail-price', label: 'Retail Price', navLabel: 'Retail Price', icon: Tags, section: 'check' },
  { path: '/serial-check', label: 'Serial Check', navLabel: 'Serial Check', icon: ScanLine, section: 'check' },
  { path: '/market-research', label: 'Market Research', navLabel: 'Market Research', icon: TrendingUp, section: 'check' },
  { path: '/inventory', label: 'Inventory', navLabel: 'Inventory', icon: Box, section: 'manage' },
  { path: '/sourcing', label: 'Sourcing', navLabel: 'Sourcing', icon: Globe, section: 'manage' },
  { path: '/invoices', label: 'Invoices', navLabel: 'Invoices', icon: Receipt, section: 'manage' },
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
]

export const getRouteMeta = (pathname: string) => appRoutes.find((route) => route.path === pathname)

export const getDeepStateRule = (pathname: string) =>
  deepStateRules.find((rule) => rule.route === pathname)
