import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'

export type LayoutMode = 'overview' | 'sidecar'

interface LayoutModeContextValue {
  mode: LayoutMode
  isSidecar: boolean
}

const LayoutModeCtx = createContext<LayoutModeContextValue>({ mode: 'overview', isSidecar: false })

/**
 * Returns the path to use when exiting sidecar (strips `mode=sidecar` from search params).
 * Use for Exit button and links so the app returns to overview layout.
 */
export function getExitSidecarPath(pathname: string, search: string): string {
  const params = new URLSearchParams(search)
  params.delete('mode')
  const q = params.toString()
  return q ? `${pathname}?${q}` : pathname
}

/**
 * Determines layout mode from URL search params.
 * Use `?mode=sidecar` to force sidecar layout (compact panel mode).
 * Without the param, defaults to overview (full dashboard).
 */
export function LayoutModeProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams()
  const paramMode = searchParams.get('mode')

  const value = useMemo<LayoutModeContextValue>(() => {
    const mode: LayoutMode = paramMode === 'sidecar' ? 'sidecar' : 'overview'
    return { mode, isSidecar: mode === 'sidecar' }
  }, [paramMode])

  return <LayoutModeCtx.Provider value={value}>{children}</LayoutModeCtx.Provider>
}

export function useLayoutMode() {
  return useContext(LayoutModeCtx)
}
