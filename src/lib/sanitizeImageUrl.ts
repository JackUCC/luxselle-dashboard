const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'avif',
  'svg',
  'bmp',
  'tif',
  'tiff',
])

/**
 * Returns a renderable secure image URL for UI usage.
 * - Upgrades http:// to https://
 * - Rejects non-HTTPS protocols
 * - Rejects obviously non-image file extensions when present
 */
export function sanitizeImageUrl(url?: string | null): string | undefined {
  if (!url) return undefined

  const trimmed = url.trim()
  if (!trimmed) return undefined

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return undefined
  }

  if (parsed.protocol === 'http:') {
    parsed.protocol = 'https:'
  }

  if (parsed.protocol !== 'https:' || !parsed.hostname) {
    return undefined
  }

  const pathname = parsed.pathname.toLowerCase()
  const extension = pathname.includes('.') ? pathname.split('.').pop() : ''
  if (extension && !IMAGE_EXTENSIONS.has(extension)) {
    return undefined
  }

  return parsed.toString()
}
