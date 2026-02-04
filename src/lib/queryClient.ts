/**
 * TanStack Query client and shared query keys for cache consistency.
 * @see docs/CODE_REFERENCE.md
 * References: @tanstack/react-query
 */
import { QueryClient } from '@tanstack/react-query'

/**
 * Global React Query client with sensible defaults for the Luxselle app
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale-while-revalidate: show cached data immediately, refetch in background
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
      
      // Retry failed requests with exponential backoff
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      
      // Refetch on window focus (useful for multi-tab workflows)
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry mutations once (most mutations are not idempotent)
      retry: 1,
      retryDelay: 1000,
    },
  },
})

/**
 * Query keys for consistent cache management
 */
export const queryKeys = {
  products: {
    all: ['products'] as const,
    list: (filters?: Record<string, unknown>) => ['products', 'list', filters] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
    transactions: (id: string) => ['products', id, 'transactions'] as const,
  },
  suppliers: {
    all: ['suppliers'] as const,
    list: (filters?: Record<string, unknown>) => ['suppliers', 'list', filters] as const,
    detail: (id: string) => ['suppliers', 'detail', id] as const,
  },
  supplierItems: {
    all: ['supplierItems'] as const,
    list: (filters?: Record<string, unknown>) => ['supplierItems', 'list', filters] as const,
  },
  buyingList: {
    all: ['buyingList'] as const,
    list: (filters?: Record<string, unknown>) => ['buyingList', 'list', filters] as const,
    detail: (id: string) => ['buyingList', 'detail', id] as const,
  },
  sourcing: {
    all: ['sourcing'] as const,
    list: (filters?: Record<string, unknown>) => ['sourcing', 'list', filters] as const,
    detail: (id: string) => ['sourcing', 'detail', id] as const,
  },
  dashboard: {
    kpis: ['dashboard', 'kpis'] as const,
    activity: (limit?: number) => ['dashboard', 'activity', limit] as const,
    status: ['dashboard', 'status'] as const,
    profit: ['dashboard', 'profit'] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    list: (filters?: Record<string, unknown>) => ['jobs', 'list', filters] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
  },
}
