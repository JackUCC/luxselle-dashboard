/** Shared schemas for serial decoding detail and pricing guidance. */
import { z } from 'zod'

export const SerialCheckBrandSchema = z.enum([
  'Louis Vuitton',
  'Chanel',
  'Gucci',
  'Hermès',
  'Prada',
  'Dior',
  'Bottega Veneta',
  'Loewe',
  'Other',
])
export type SerialCheckBrand = z.infer<typeof SerialCheckBrandSchema>

export const SerialDecodeSourceSchema = z.enum(['rule_based', 'ai_heuristic'])
export type SerialDecodeSource = z.infer<typeof SerialDecodeSourceSchema>

export const SerialDecodePrecisionSchema = z.enum([
  'exact_week',
  'exact_month',
  'exact_year',
  'year_window',
  'unknown',
])
export type SerialDecodePrecision = z.infer<typeof SerialDecodePrecisionSchema>

export const SerialProductionWindowSchema = z
  .object({
    startYear: z.number().int().min(1900).max(2100),
    endYear: z.number().int().min(1900).max(2100),
    startMonth: z.number().int().min(1).max(12).optional(),
    endMonth: z.number().int().min(1).max(12).optional(),
    label: z.string().optional(),
  })
  .refine((value) => value.endYear >= value.startYear, {
    message: 'endYear must be greater than or equal to startYear',
    path: ['endYear'],
  })
export type SerialProductionWindow = z.infer<typeof SerialProductionWindowSchema>

export const SerialDecodeCandidateSchema = z.object({
  label: z.string(),
  year: z.number().int().min(1900).max(2100).optional(),
  period: z.string().optional(),
  productionWindow: SerialProductionWindowSchema.optional(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
})
export type SerialDecodeCandidate = z.infer<typeof SerialDecodeCandidateSchema>

export const SerialDecodeResultSchema = z.object({
  success: z.boolean(),
  brand: SerialCheckBrandSchema.optional(),
  normalizedSerial: z.string().optional(),
  source: SerialDecodeSourceSchema,
  precision: SerialDecodePrecisionSchema,
  confidence: z.number().min(0).max(1),
  year: z.number().int().min(1900).max(2100).optional(),
  period: z.string().optional(),
  productionWindow: SerialProductionWindowSchema.optional(),
  message: z.string(),
  note: z.string().optional(),
  rationale: z.array(z.string()).default([]),
  uncertainties: z.array(z.string()).default([]),
  candidates: z.array(SerialDecodeCandidateSchema).optional(),
  formatMatched: z.string().optional(),
})
export type SerialDecodeResult = z.infer<typeof SerialDecodeResultSchema>

export const SerialPricingAdjustmentSchema = z.object({
  ageYears: z.number().min(0),
  ageAdjustmentPct: z.number(),
  confidencePenaltyPct: z.number().min(0),
  totalAdjustmentPct: z.number(),
})
export type SerialPricingAdjustment = z.infer<typeof SerialPricingAdjustmentSchema>

export const SerialPricingGuidanceSchema = z.object({
  marketAverageEur: z.number().min(0),
  estimatedWorthEur: z.number().min(0),
  recommendedMaxPayEur: z.number().min(0),
  adjustment: SerialPricingAdjustmentSchema,
  summary: z.string(),
})
export type SerialPricingGuidance = z.infer<typeof SerialPricingGuidanceSchema>

export const SerialDecodeHeuristicInputSchema = z.object({
  brand: SerialCheckBrandSchema,
  serial: z.string().trim().min(1),
  itemDescription: z.string().trim().optional(),
})
export type SerialDecodeHeuristicInput = z.infer<typeof SerialDecodeHeuristicInputSchema>
