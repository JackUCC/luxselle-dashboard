/**
 * Decode luxury bag serial/date codes to production year (and week or month where applicable).
 * Formats based on published brand date-code guides (Louis Vuitton, Chanel). Other brands
 * show a generic message. This is a guide only; authentication should be done by an expert.
 */

import type {
  SerialDecodeCandidate,
  SerialDecodePrecision,
  SerialDecodeResult as SharedSerialDecodeResult,
  SerialProductionWindow,
} from '@shared/schemas'

export interface DecodeResult extends SharedSerialDecodeResult {}

const BRANDS = [
  'Louis Vuitton',
  'Chanel',
  'Gucci',
  'Hermès',
  'Prada',
  'Dior',
  'Bottega Veneta',
  'Loewe',
  'Other',
] as const

export type SerialCheckBrand = (typeof BRANDS)[number]

type DecodedCandidate = {
  label: string
  year: number
  period?: string
  confidence: number
  precision: Exclude<SerialDecodePrecision, 'unknown' | 'year_window'>
  productionWindow: SerialProductionWindow
  rationale: string
  formatMatched: string
}

const MONTHS = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const CHANEL_7_DIGIT_WINDOWS: Record<number, SerialProductionWindow> = {
  0: { startYear: 1986, endYear: 1988 },
  1: { startYear: 1989, endYear: 1991 },
  2: { startYear: 1991, endYear: 1994 },
  3: { startYear: 1994, endYear: 1996 },
  4: { startYear: 1996, endYear: 1997 },
  5: { startYear: 1997, endYear: 1999 },
  6: { startYear: 2000, endYear: 2002 },
  7: { startYear: 2002, endYear: 2003 },
  8: { startYear: 2003, endYear: 2004 },
  9: { startYear: 2004, endYear: 2005 },
}

const CHANEL_8_DIGIT_WINDOWS: Record<number, SerialProductionWindow> = {
  10: { startYear: 2005, endYear: 2006 },
  11: { startYear: 2006, endYear: 2007 },
  12: { startYear: 2007, endYear: 2008 },
  13: { startYear: 2009, endYear: 2009 },
  14: { startYear: 2010, endYear: 2010 },
  15: { startYear: 2011, endYear: 2011 },
  16: { startYear: 2012, endYear: 2012 },
  17: { startYear: 2012, endYear: 2013 },
  18: { startYear: 2013, endYear: 2014 },
  19: { startYear: 2014, endYear: 2014 },
  20: { startYear: 2014, endYear: 2015 },
  21: { startYear: 2015, endYear: 2015 },
  22: { startYear: 2016, endYear: 2016 },
  23: { startYear: 2016, endYear: 2017 },
  24: { startYear: 2017, endYear: 2017 },
  25: { startYear: 2018, endYear: 2018 },
  26: { startYear: 2018, endYear: 2019 },
  27: { startYear: 2019, endYear: 2019 },
  28: { startYear: 2019, endYear: 2020 },
  29: { startYear: 2020, endYear: 2020 },
  30: { startYear: 2020, endYear: 2021 },
  31: { startYear: 2021, endYear: 2021 },
  32: { startYear: 2021, endYear: 2022 },
}

function toCandidateOutput(candidate: DecodedCandidate): SerialDecodeCandidate {
  return {
    label: candidate.label,
    year: candidate.year,
    period: candidate.period,
    productionWindow: candidate.productionWindow,
    confidence: candidate.confidence,
    rationale: candidate.rationale,
  }
}

function buildFailure(
  brand: SerialCheckBrand,
  normalizedSerial: string,
  message: string,
  note?: string,
  rationale?: string[],
): DecodeResult {
  return {
    success: false,
    brand,
    normalizedSerial,
    source: 'rule_based',
    precision: 'unknown',
    confidence: 0,
    message,
    note,
    rationale: rationale ?? [],
    uncertainties: [],
  }
}

function buildResultFromCandidate(
  brand: SerialCheckBrand,
  normalizedSerial: string,
  candidate: DecodedCandidate,
  message: string,
  note: string,
): DecodeResult {
  return {
    success: true,
    brand,
    normalizedSerial,
    source: 'rule_based',
    precision: candidate.precision,
    confidence: candidate.confidence,
    year: candidate.year,
    period: candidate.period,
    productionWindow: candidate.productionWindow,
    message,
    note,
    rationale: [candidate.rationale],
    uncertainties: [],
    formatMatched: candidate.formatMatched,
  }
}

/** Normalize code: strip spaces, optional "VI" style suffix for LV 1980s */
function normalizeCode(input: string): string {
  return input.replace(/\s+/g, '').trim().toUpperCase()
}

/** Extract digits-only part (e.g. "SR3179" → "3179") */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}

/** Louis Vuitton: 2007–March 2021 = 2 letters + 4 digits. First & third = week, second & fourth = year. */
function decodeLVModernCandidate(code: string): DecodedCandidate | null {
  const match = code.match(/^[A-Z]{2}(\d)(\d)(\d)(\d)$/)
  if (!match) return null
  const [, d0, d1, d2, d3] = match
  const week = parseInt(d0 + d2, 10)
  const yearShort = parseInt(d1 + d3, 10)
  if (week < 1 || week > 53) return null
  const year = yearShort >= 90 ? 1900 + yearShort : 2000 + yearShort
  if (year < 1990 || year > 2030) return null
  return {
    label: 'LV 2 letters + 4 digits (week/year)',
    year,
    period: `Week ${week}`,
    confidence: 0.95,
    precision: 'exact_week',
    productionWindow: { startYear: year, endYear: year },
    rationale: `Digits 1+3 map to week (${week}); digits 2+4 map to year (${year}).`,
    formatMatched: 'LV_2007_2021_WEEK_YEAR',
  }
}

/** Louis Vuitton: 1990–2006 = 2 letters + 4 digits. First & third = month, second & fourth = year. */
function decodeLV1990to2006Candidate(code: string): DecodedCandidate | null {
  const match = code.match(/^[A-Z]{2}(\d)(\d)(\d)(\d)$/)
  if (!match) return null
  const [, d0, d1, d2, d3] = match
  const month = parseInt(d0 + d2, 10)
  const yearShort = parseInt(d1 + d3, 10)
  if (month < 1 || month > 12) return null
  const year = 2000 + yearShort
  if (year < 1990 || year > 2006) return null
  const monthName = MONTHS[month]
  return {
    label: 'LV 2 letters + 4 digits (month/year)',
    year,
    period: monthName,
    confidence: 0.92,
    precision: 'exact_month',
    productionWindow: { startYear: year, endYear: year, startMonth: month, endMonth: month },
    rationale: `Digits 1+3 map to month (${monthName}); digits 2+4 map to year (${year}).`,
    formatMatched: 'LV_1990_2006_MONTH_YEAR',
  }
}

/** Louis Vuitton: 1980s = 3–4 digits, optionally + 2 letters. First two = year, last = month. */
function decodeLV1980sCandidate(code: string): DecodedCandidate | null {
  const digits = digitsOnly(code)
  if (digits.length < 3 || digits.length > 4) return null
  const yearShort = parseInt(digits.slice(0, 2), 10)
  const month = parseInt(digits.slice(-1), 10)
  if (month < 1 || month > 9) return null
  const year = 1900 + yearShort
  if (year < 1982 || year > 1989) return null
  const monthName = MONTHS[month]
  return {
    label: 'LV 3-4 digits (1980s year/month)',
    year,
    period: monthName,
    confidence: 0.85,
    precision: 'exact_month',
    productionWindow: { startYear: year, endYear: year, startMonth: month, endMonth: month },
    rationale: `First two digits map to year (${year}); last digit maps to month (${monthName}).`,
    formatMatched: 'LV_1980S_YEAR_MONTH',
  }
}

function decodeLouisVuitton(code: string): DecodeResult {
  const c = normalizeCode(code)
  if (c.length < 5) {
    const r = decodeLV1980sCandidate(c)
    if (r) {
      return buildResultFromCandidate(
        'Louis Vuitton',
        c,
        r,
        `Production: ${r.period} ${r.year}.`,
        'Format: 3-4 digits (year + month), sometimes followed by 2 letters (factory).',
      )
    }
  }
  if (c.length >= 6 && /^[A-Z]{2}\d{4}$/.test(c)) {
    const modern = decodeLVModernCandidate(c)
    const old = decodeLV1990to2006Candidate(c)
    if (old) {
      return buildResultFromCandidate(
        'Louis Vuitton',
        c,
        old,
        `Production: ${old.period} ${old.year}.`,
        modern
          ? 'Format overlap detected. Timeline rule prioritizes month/year decoding for 1990-2006.'
          : 'Format: 2 letters (factory) + 4 digits (month/year).',
      )
    }
    if (modern && modern.year >= 2007) {
      return buildResultFromCandidate(
        'Louis Vuitton',
        c,
        modern,
        `Production: ${modern.period}, ${modern.year}.`,
        'Format: 2 letters (factory) + 4 digits (week/year). Pre-March 2021; newer items use RFID.',
      )
    }
    if (modern) {
      return {
        success: true,
        brand: 'Louis Vuitton',
        normalizedSerial: c,
        source: 'rule_based',
        precision: 'year_window',
        confidence: 0.55,
        productionWindow: {
          startYear: modern.year,
          endYear: modern.year,
          label: `Anomalous week/year decode (${modern.period}) outside standard 2007+ timeline`,
        },
        message: `Code reads as ${modern.period}, ${modern.year}, but this falls outside the standard LV 2007+ week/year era.`,
        note: 'Treat this as low-confidence and verify against receipt date or third-party authentication.',
        rationale: [modern.rationale],
        uncertainties: [
          'No valid 1990-2006 month/year interpretation was found.',
          'Week/year interpretation suggests a year before 2007, which is atypical for this LV format.',
        ],
        candidates: [toCandidateOutput(modern)],
        formatMatched: 'LV_ANOMALOUS_WEEK_YEAR',
      }
    }
  }
  return buildFailure(
    'Louis Vuitton',
    c,
    "Couldn't read this Louis Vuitton date code. Check format: 2 letters + 4 digits (e.g. SR3179), or 3–4 digits for 1980s. Post–March 2021 items use a microchip, not a stamped code.",
    undefined,
    ['No supported LV date-code pattern matched this serial.'],
  )
}

/** Chanel: 8-digit sticker serial (2005-2022) maps by prefix block to year or narrow year window. */
function decodeChanel8Digit(code: string): DecodeResult | null {
  const digits = digitsOnly(code)
  if (digits.length !== 8) return null
  const prefix = parseInt(digits.slice(0, 2), 10)
  const window = CHANEL_8_DIGIT_WINDOWS[prefix]
  if (!window) return null
  const exactYear = window.startYear === window.endYear ? window.startYear : undefined
  const precision: SerialDecodePrecision = exactYear ? 'exact_year' : 'year_window'
  return {
    success: true,
    brand: 'Chanel',
    normalizedSerial: normalizeCode(code),
    source: 'rule_based',
    precision,
    confidence: exactYear ? 0.88 : 0.8,
    year: exactYear,
    productionWindow: window,
    message: exactYear
      ? `Serial prefix ${prefix} indicates production around ${exactYear}.`
      : `Serial prefix ${prefix} indicates production window ${window.startYear}-${window.endYear}.`,
    note: 'Chanel serial sticker prefixes map to production series ranges (2005-2022). From 2021 onward, metal plates may not encode year.',
    rationale: [`8-digit Chanel prefix ${prefix} maps to the ${window.startYear}-${window.endYear} production series.`],
    uncertainties: exactYear ? [] : ['Prefix maps to a range; exact month/year requires additional provenance.'],
    formatMatched: 'CHANEL_8_DIGIT_PREFIX_SERIES',
  }
}

/** Chanel: 7-digit sticker serial (1986-2005) maps by first digit to year block. */
function decodeChanel7Digit(code: string): DecodeResult | null {
  const digits = digitsOnly(code)
  if (digits.length !== 7) return null
  const first = parseInt(digits[0], 10)
  const window = CHANEL_7_DIGIT_WINDOWS[first]
  if (!window) return null
  const exactYear = window.startYear === window.endYear ? window.startYear : undefined
  const precision: SerialDecodePrecision = exactYear ? 'exact_year' : 'year_window'
  return {
    success: true,
    brand: 'Chanel',
    normalizedSerial: normalizeCode(code),
    source: 'rule_based',
    precision,
    confidence: exactYear ? 0.84 : 0.75,
    year: exactYear,
    productionWindow: window,
    message: exactYear
      ? `Serial indicates production around ${exactYear}.`
      : `Serial indicates production window ${window.startYear}-${window.endYear}.`,
    note: 'Chanel 7-digit stickers map to historical production series, not a guaranteed exact year.',
    rationale: [`7-digit Chanel first digit ${first} maps to the ${window.startYear}-${window.endYear} production block.`],
    uncertainties: exactYear ? [] : ['7-digit Chanel stickers are usually dateable to a narrow block, not an exact month.'],
    formatMatched: 'CHANEL_7_DIGIT_SERIES',
  }
}

function decodeChanel(code: string): DecodeResult {
  const normalized = normalizeCode(code)
  const digits = digitsOnly(normalized)
  if (digits.length === 8) {
    const r = decodeChanel8Digit(code)
    if (r) return r
  }
  if (digits.length === 7) {
    const r = decodeChanel7Digit(code)
    if (r) return r
  }
  return buildFailure(
    'Chanel',
    normalized,
    "Couldn't read this Chanel serial. Expect 7 digits (1986–2005) or 8 digits (2005–2022). From 2021, metal plates no longer encode year.",
    undefined,
    ['No supported Chanel serial prefix block matched this code.'],
  )
}

/** Generic / other brands: no standard; show guidance. */
function decodeOther(code: string, brand: SerialCheckBrand): DecodeResult {
  const normalized = normalizeCode(code)
  return buildFailure(
    brand,
    normalized,
    "We don't have a date decoder for this brand yet. You can look up the brand's date code format online or ask an authenticator.",
    'Supported rule-based decoders: Louis Vuitton and Chanel. You can still run AI heuristic decode for all brands.',
    ['Brand-specific serial specification is not in the local deterministic decoder.'],
  )
}

export function decodeSerialToYear(serial: string, brand: SerialCheckBrand): DecodeResult {
  const code = normalizeCode(serial)
  if (!code) {
    return buildFailure(brand, '', 'Enter a serial or date code to decode.')
  }
  switch (brand) {
    case 'Louis Vuitton':
      return decodeLouisVuitton(code)
    case 'Chanel':
      return decodeChanel(code)
    case 'Gucci':
    case 'Hermès':
    case 'Prada':
    case 'Dior':
    case 'Bottega Veneta':
    case 'Loewe':
    case 'Other':
      return decodeOther(code, brand)
    default:
      return decodeOther(code, 'Other')
  }
}

export { BRANDS as SERIAL_CHECK_BRANDS }
