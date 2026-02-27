import { useCallback, useEffect, useState } from 'react'
import { fetchEurToJpy, type FxResult } from '../lib/fxRate'

export interface UseFxRateResult {
  fx: FxResult | null
  loading: boolean
  error: string | null
  retry: () => Promise<void>
}

export function useFxRate(): UseFxRateResult {
  const [fx, setFx] = useState<FxResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchEurToJpy()
      setFx(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load FX rate'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { fx, loading, error, retry: load }
}
