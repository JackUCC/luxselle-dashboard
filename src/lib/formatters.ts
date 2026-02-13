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
