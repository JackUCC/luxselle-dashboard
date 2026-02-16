/**
 * Fallback image URLs when product/supplier images fail to load (e.g. 403/404 from Storage).
 * Used in img onError handlers so broken images show a placeholder instead of the browser broken icon.
 * Uses inline SVG data URIs (no external service dependency).
 */
const svgPlaceholder = (w: number, h: number, fontSize: number) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="#f3f4f6"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".35em" fill="#9ca3af" font-family="sans-serif" font-size="${fontSize}">No image</text>
</svg>`
  )}`

export const PLACEHOLDER_IMAGE = svgPlaceholder(400, 400, 24)
export const PLACEHOLDER_IMAGE_SMALL = svgPlaceholder(100, 100, 12)
