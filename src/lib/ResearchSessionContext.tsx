import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type ResearchSessionStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ResearchSession<TResult = unknown, TQuery = unknown> {
  status: ResearchSessionStatus
  query?: TQuery
  result?: TResult
  error?: string
  startedAt?: number
  updatedAt?: number
}

type AnyResearchSession = ResearchSession<unknown, unknown>
type SessionStore = Record<string, AnyResearchSession>

interface ResearchSessionContextValue {
  sessions: SessionStore
  startLoading: <TQuery>(key: string, query?: TQuery) => void
  setSuccess: <TResult, TQuery>(key: string, result: TResult, query?: TQuery) => void
  setError: <TQuery>(key: string, message: string, query?: TQuery) => void
  clear: (key: string) => void
}

const ResearchSessionContext = createContext<ResearchSessionContextValue | null>(null)
const IDLE_SESSION: AnyResearchSession = { status: 'idle' }

export function ResearchSessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<SessionStore>({})

  const startLoading = useCallback(<TQuery,>(key: string, query?: TQuery) => {
    const now = Date.now()
    setSessions((prev) => ({
      ...prev,
      [key]: {
        status: 'loading',
        query: (query ?? prev[key]?.query) as unknown,
        result: undefined,
        error: undefined,
        startedAt: now,
        updatedAt: now,
      },
    }))
  }, [])

  const setSuccess = useCallback(<TResult, TQuery,>(key: string, result: TResult, query?: TQuery) => {
    const now = Date.now()
    setSessions((prev) => {
      const previous = prev[key]
      return {
        ...prev,
        [key]: {
          status: 'success',
          query: (query ?? previous?.query) as unknown,
          result: result as unknown,
          error: undefined,
          startedAt: previous?.startedAt ?? now,
          updatedAt: now,
        },
      }
    })
  }, [])

  const setError = useCallback(<TQuery,>(key: string, message: string, query?: TQuery) => {
    const now = Date.now()
    setSessions((prev) => {
      const previous = prev[key]
      return {
        ...prev,
        [key]: {
          status: 'error',
          query: (query ?? previous?.query) as unknown,
          result: undefined,
          error: message,
          startedAt: previous?.startedAt ?? now,
          updatedAt: now,
        },
      }
    })
  }, [])

  const clear = useCallback((key: string) => {
    setSessions((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const value = useMemo<ResearchSessionContextValue>(
    () => ({
      sessions,
      startLoading,
      setSuccess,
      setError,
      clear,
    }),
    [sessions, startLoading, setSuccess, setError, clear]
  )

  return <ResearchSessionContext.Provider value={value}>{children}</ResearchSessionContext.Provider>
}

export function useResearchSession<TResult = unknown, TQuery = unknown>(key: string) {
  const context = useContext(ResearchSessionContext)
  if (!context) {
    throw new Error('useResearchSession must be used within ResearchSessionProvider')
  }

  const session = (context.sessions[key] as ResearchSession<TResult, TQuery> | undefined) ?? (IDLE_SESSION as ResearchSession<TResult, TQuery>)

  const startLoading = useCallback(
    (query?: TQuery) => {
      context.startLoading(key, query)
    },
    [context, key]
  )

  const setSuccess = useCallback(
    (result: TResult, query?: TQuery) => {
      context.setSuccess(key, result, query)
    },
    [context, key]
  )

  const setError = useCallback(
    (message: string, query?: TQuery) => {
      context.setError(key, message, query)
    },
    [context, key]
  )

  const clear = useCallback(() => {
    context.clear(key)
  }, [context, key])

  return {
    session,
    startLoading,
    setSuccess,
    setError,
    clear,
  }
}
