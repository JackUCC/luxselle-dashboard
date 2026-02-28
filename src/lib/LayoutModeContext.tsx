import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'

export type LayoutMode = 'overview' | 'sidecar'
const MODE_QUERY_KEY = 'mode'

interface LayoutModeContextValue {
  mode: LayoutMode
  isSidecar: boolean
}

const LayoutModeCtx = createContext<LayoutModeContextValue>({ mode: 'overview', isSidecar: false })

function resolveCurrentPath(pathname: string): string {
  if (pathname !== '/') return pathname
  if (typeof window === 'undefined') return pathname
  return window.location.pathname || pathname
}

function withMode(pathname: string, search: string, mode: LayoutMode): string {
  const params = new URLSearchParams(search)
  if (mode === 'sidecar') {
    params.set(MODE_QUERY_KEY, 'sidecar')
  } else {
    params.delete(MODE_QUERY_KEY)
  }
  const q = params.toString()
  return q ? `${pathname}?${q}` : pathname
}

/**
 * Returns the path to use when exiting sidecar (strips `mode=sidecar` from search params).
 * Use for Exit button and links so the app returns to overview layout.
 */
export function getExitSidecarPath(pathname: string, search: string): string {
  const targetPath = resolveCurrentPath(pathname)
  return withMode(targetPath, search, 'overview')
}

/**
 * Returns the sidecar-mode path for internal navigation while preserving query intent.
 */
export function getSidecarPath(pathname: string, search: string): string {
  return withMode(pathname, search, 'sidecar')
}

/**
 * Determines layout mode from URL search params.
 * Use `?mode=sidecar` to force sidecar layout (compact panel mode).
 * Without the param, defaults to overview (full dashboard).
 */
export function LayoutModeProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams()
  const paramMode = searchParams.get(MODE_QUERY_KEY)

  const value = useMemo<LayoutModeContextValue>(() => {
    const mode: LayoutMode = paramMode === 'sidecar' ? 'sidecar' : 'overview'
    return { mode, isSidecar: mode === 'sidecar' }
  }, [paramMode])

  return <LayoutModeCtx.Provider value={value}>{children}</LayoutModeCtx.Provider>
}

export function useLayoutMode() {
  return useContext(LayoutModeCtx)
}
