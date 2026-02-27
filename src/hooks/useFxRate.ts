import { useEffect, useState } from 'react'
import { fetchEurToJpy, type FxResult } from '../lib/fxRate'

export function useFxRate() {
  const [data, setData] = useState<FxResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const refresh = async () => {
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
  }

  useEffect(() => {
    refresh()
  }, [])

  return { data, isLoading, error, refresh }
}
