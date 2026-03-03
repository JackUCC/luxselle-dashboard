import { useCallback, useEffect, useState } from 'react'
import { fetchEurToJpy, type FxResult } from '../lib/fxRate'

const REFRESH_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes

export function useFxRate() {
  const [data, setData] = useState<FxResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchEurToJpy()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load FX rate'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const id = setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [refresh])

  return { data, isLoading, error, refresh }
}
