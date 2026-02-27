/**
 * Shared formatting utilities used across Dashboard, Inventory, and BuyBox views.
 */

/** Format a number as EUR currency with zero decimal places. */
export const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
    }).format(value)

/** Format a number as JPY currency with zero decimal places. */
export function formatJpy(value: number): string {
    return new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
        maximumFractionDigits: 0,
    }).format(value)
}

/** Format a number as EUR currency with two decimal places. */
export function formatEur(value: number): string {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value)
}

/** Parse a numeric input string (allows commas); returns 0 if invalid or negative. */
export function parseNumericInput(value: string): number {
    const n = parseFloat(value.replace(/,/g, ''))
    return Number.isFinite(n) && n >= 0 ? n : 0
}

/** Format a date string as a relative time label (e.g. "5 mins ago", "3 hours ago", or "Feb 12"). */
export const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60 * 60 * 1000) {
        return `${Math.floor(diff / (60 * 1000))} mins ago`
    }
    if (diff < 24 * 60 * 60 * 1000) {
        return `${Math.floor(diff / (60 * 60 * 1000))} hours ago`
    }
    return new Intl.DateTimeFormat('en-GB', {
        month: 'short',
        day: 'numeric',
    }).format(date)
}
