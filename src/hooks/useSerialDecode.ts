import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import { apiPost, ApiError } from '../lib/api'
import {
  decodeSerialToYear,
  type DecodeResult,
  type SerialCheckBrand,
} from '../lib/serialDateDecoder'
import { calculateSerialPricingGuidance } from '../lib/serialValuation'
import type { SerialDecodeResult, SerialPricingGuidance } from '@shared/schemas'

interface PriceCheckResult {
  averageSellingPriceEur: number
  maxBuyEur: number
  maxBidEur: number
  comps: Array<{ title: string; price: number; source: string; sourceUrl?: string }>
}

export interface UseSerialDecodeResult {
  serial: string
  setSerial: (s: string) => void
  brand: SerialCheckBrand
  setBrand: (b: SerialCheckBrand) => void
  description: string
  setDescription: (s: string) => void
  result: DecodeResult | null
  guidance: SerialPricingGuidance | null
  isLoading: boolean
  hasTriedDecode: boolean
  handleDecode: () => Promise<void>
  clear: () => void
}

export function useSerialDecode(): UseSerialDecodeResult {
  const [serial, setSerial] = useState('')
  const [brand, setBrand] = useState<SerialCheckBrand>('Louis Vuitton')
  const [description, setDescription] = useState('')
  const [result, setResult] = useState<DecodeResult | null>(null)
  const [guidance, setGuidance] = useState<SerialPricingGuidance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasTriedDecode, setHasTriedDecode] = useState(false)

  const handleDecode = useCallback(async () => {
    const normalizedDescription = description.trim()
    if (!serial.trim()) {
      toast.error('Enter serial')
      return
    }
    if (!normalizedDescription) {
      toast.error('Add item description')
      return
    }
    setHasTriedDecode(true)
    setIsLoading(true)
    setGuidance(null)
    try {
      let decoded = decodeSerialToYear(serial, brand)
      if (decoded.precision === 'unknown' || decoded.confidence < 0.7) {
        try {
          const { data } = await apiPost<{ data: SerialDecodeResult }>('/ai/serial-decode', {
            brand,
            serial,
            itemDescription: normalizedDescription,
          })
          decoded = data
        } catch {
          // keep local result
        }
      }
      const { data: market } = await apiPost<{ data: PriceCheckResult }>('/pricing/price-check', {
        query: normalizedDescription,
      })
      setResult(decoded)
      setGuidance(
        calculateSerialPricingGuidance({
          marketAverageEur: market.averageSellingPriceEur,
          decode: decoded,
        })
      )
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Decode failed'
      toast.error(message)
      setResult(decodeSerialToYear(serial, brand))
    } finally {
      setIsLoading(false)
    }
  }, [serial, brand, description])

  const clear = useCallback(() => {
    setSerial('')
    setResult(null)
    setGuidance(null)
    setHasTriedDecode(false)
  }, [])

  return {
    serial,
    setSerial,
    brand,
    setBrand,
    description,
    setDescription,
    result,
    guidance,
    isLoading,
    hasTriedDecode,
    handleDecode,
    clear,
  }
}
