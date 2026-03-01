import {
  Bookmark,
  Box,
  Briefcase,
  CircleDollarSign,
  Globe,
  House,
  Receipt,
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
  { path: '/evaluate', label: 'Sourcing Intelligence', navLabel: 'Evaluate', icon: CircleDollarSign, section: 'check' },
  { path: '/retail-price', label: 'Retail Price', navLabel: 'Retail Price', icon: Tags, section: 'check' },
  { path: '/market-research', label: 'Market Research', navLabel: 'Market Research', icon: TrendingUp, section: 'check' },
  { path: '/saved-research', label: 'Saved Research', navLabel: 'Saved Research', icon: Bookmark, section: 'check' },
  { path: '/inventory', label: 'Inventory', navLabel: 'Inventory', icon: Box, section: 'manage' },
  { path: '/sourcing', label: 'Sourcing', navLabel: 'Sourcing', icon: Globe, section: 'manage' },
  { path: '/invoices', label: 'Invoices', navLabel: 'Invoices', icon: Receipt, section: 'manage' },
  { path: '/jobs', label: 'Jobs', navLabel: 'Jobs', icon: Briefcase, section: 'manage' },
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
    route: '/evaluate',
    keys: ['q', 'condition', 'serial', 'brand'],
    toCrumbLabel: (params) => {
      const labels: string[] = []
      if (params.get('serial')) labels.push('Serial Context')
      if (params.get('condition')) labels.push('Condition')
      if (!labels.length && params.get('brand')) labels.push('Brand')
      if (!labels.length && params.get('q')) labels.push('Prefilled')
      return labels.length ? labels : ['Prefilled']
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
]

export const getRouteMeta = (pathname: string) => appRoutes.find((route) => route.path === pathname)

export const getDeepStateRule = (pathname: string) =>
  deepStateRules.find((rule) => rule.route === pathname)
