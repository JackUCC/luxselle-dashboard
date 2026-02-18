/**
 * Decode luxury bag serial/date codes to production year (and week or month where applicable).
 * Formats based on published brand date-code guides (Louis Vuitton, Chanel). Other brands
 * show a generic message. This is a guide only; authentication should be done by an expert.
 */

export interface DecodeResult {
  success: boolean
  year?: number
  /** e.g. "Week 37" or "June" */
  period?: string
  /** Human-readable summary */
  message: string
  /** Optional note (e.g. format used) */
  note?: string
}

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

/** Normalize code: strip spaces, optional "VI" style suffix for LV 1980s */
function normalizeCode(input: string): string {
  return input.replace(/\s+/g, '').trim().toUpperCase()
}

/** Extract digits-only part (e.g. "SR3179" → "3179") */
function digitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}

/** Louis Vuitton: 2007–March 2021 = 2 letters + 4 digits. First & third = week, second & fourth = year. */
function decodeLVModern(code: string): DecodeResult | null {
  const match = code.match(/^[A-Z]{2}(\d)(\d)(\d)(\d)$/)
  if (!match) return null
  const [, d0, d1, d2, d3] = match
  const week = parseInt(d0 + d2, 10)
  const yearShort = parseInt(d1 + d3, 10)
  if (week < 1 || week > 53) return null
  const year = yearShort >= 90 ? 1900 + yearShort : 2000 + yearShort
  if (year < 1990 || year > 2030) return null
  return {
    success: true,
    year,
    period: `Week ${week}`,
    message: `Production: Week ${week}, ${year}.`,
    note: 'Format: 2 letters (factory) + 4 digits (week/year). Pre–March 2021; newer items use RFID.',
  }
}

/** Louis Vuitton: 1990–2006 = 2 letters + 4 digits. First & third = month, second & fourth = year. */
function decodeLV1990to2006(code: string): DecodeResult | null {
  const match = code.match(/^[A-Z]{2}(\d)(\d)(\d)(\d)$/)
  if (!match) return null
  const [, d0, d1, d2, d3] = match
  const month = parseInt(d0 + d2, 10)
  const yearShort = parseInt(d1 + d3, 10)
  if (month < 1 || month > 12) return null
  const year = 2000 + yearShort
  if (year < 1990 || year > 2006) return null
  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return {
    success: true,
    year,
    period: months[month],
    message: `Production: ${months[month]} ${year}.`,
    note: 'Format: 2 letters (factory) + 4 digits (month/year).',
  }
}

/** Louis Vuitton: 1980s = 3–4 digits, optionally + 2 letters. First two = year, last = month. */
function decodeLV1980s(code: string): DecodeResult | null {
  const digits = digitsOnly(code)
  if (digits.length < 3 || digits.length > 4) return null
  const yearShort = parseInt(digits.slice(0, 2), 10)
  const month = parseInt(digits.slice(-1), 10)
  if (month < 1 || month > 9) return null
  const year = 1900 + yearShort
  if (year < 1982 || year > 1989) return null
  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September']
  return {
    success: true,
    year,
    period: months[month],
    message: `Production: ${months[month]} ${year}.`,
    note: 'Format: 3–4 digits (year + month), sometimes followed by 2 letters (factory).',
  }
}

function decodeLouisVuitton(code: string): DecodeResult {
  const c = normalizeCode(code)
  if (c.length < 5) {
    const r = decodeLV1980s(c)
    if (r) return r
  }
  if (c.length >= 6 && /^[A-Z]{2}\d{4}$/.test(c)) {
    const modern = decodeLVModern(c)
    if (modern && modern.year && modern.year >= 2007) return modern
    const old = decodeLV1990to2006(c)
    if (old) return old
  }
  return {
    success: false,
    message: "Couldn't read this Louis Vuitton date code. Check format: 2 letters + 4 digits (e.g. SR3179), or 3–4 digits for 1980s. Post–March 2021 items use a microchip, not a stamped code.",
  }
}

/** Chanel: 2005–present = 8 digits, first two = year (e.g. 25 → 2025). */
function decodeChanel8Digit(code: string): DecodeResult | null {
  const digits = digitsOnly(code)
  if (digits.length !== 8) return null
  const yearShort = parseInt(digits.slice(0, 2), 10)
  if (yearShort < 5 || yearShort > 99) return null
  const year = 2000 + yearShort
  return {
    success: true,
    year,
    message: `Serial indicates production year: ${year}.`,
    note: 'Chanel 8-digit sticker (2005–2022). Newer items use metal plates without year in code.',
  }
}

/** Chanel: 1986–2005 = 7 digits, first digit = year (0=1990, 1=1991, … 9=1999). */
function decodeChanel7Digit(code: string): DecodeResult | null {
  const digits = digitsOnly(code)
  if (digits.length !== 7) return null
  const first = parseInt(digits[0], 10)
  const year = 1990 + first
  if (year < 1986 || year > 2005) return null
  return {
    success: true,
    year,
    message: `Serial indicates production year around ${year}.`,
    note: 'Chanel 7-digit sticker (1986–2005).',
  }
}

function decodeChanel(code: string): DecodeResult {
  const digits = digitsOnly(normalizeCode(code))
  if (digits.length === 8) {
    const r = decodeChanel8Digit(code)
    if (r) return r
  }
  if (digits.length === 7) {
    const r = decodeChanel7Digit(code)
    if (r) return r
  }
  return {
    success: false,
    message: "Couldn't read this Chanel serial. Expect 7 digits (1986–2005) or 8 digits (2005–2022). From 2021, metal plates no longer encode year.",
  }
}

/** Generic / other brands: no standard; show guidance. */
function decodeOther(_code: string): DecodeResult {
  return {
    success: false,
    message: "We don't have a date decoder for this brand yet. You can look up the brand's date code format online or ask an authenticator.",
    note: 'Supported brands: Louis Vuitton, Chanel. More may be added later.',
  }
}

export function decodeSerialToYear(serial: string, brand: SerialCheckBrand): DecodeResult {
  const code = normalizeCode(serial)
  if (!code) {
    return { success: false, message: 'Enter a serial or date code to decode.' }
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
      return decodeOther(code)
    default:
      return decodeOther(code)
  }
}

export { BRANDS as SERIAL_CHECK_BRANDS }
