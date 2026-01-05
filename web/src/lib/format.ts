/**
 * Formatting utilities for Haushaltsbuch
 * German locale (de-DE) formatting for numbers, dates, and currency
 */

/**
 * Format cents to German currency
 * @param cents - Amount in cents (positive integer)
 * @returns Formatted string like "1.234,56 €"
 * @example formatAmount(123456) // "1.234,56 €"
 */
export function formatAmount(cents: number): string {
  const euros = cents / 100
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(euros)
}

/**
 * Compact formatting for charts (shortens large amounts)
 * @param cents - Amount in cents
 * @returns Compact string like "1,2k €" or "234 €"
 * @example formatCompactAmount(123456) // "1,2k €"
 * @example formatCompactAmount(23456) // "235 €"
 */
export function formatCompactAmount(cents: number): string {
  const euros = cents / 100
  if (euros >= 1000) {
    return `${(euros / 1000).toFixed(1).replace('.', ',')}k €`
  }
  return `${Math.round(euros)} €`
}

/**
 * Format date to German locale
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormatOptions (optional)
 * @returns Formatted date string like "15.01.2025"
 * @example formatDate("2025-01-15") // "15.01.2025"
 */
export function formatDate(
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(
    'de-DE',
    options || {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }
  )
}

/**
 * Format month for chart labels (short format)
 * @param dateString - Date string in ISO format
 * @returns Short month string like "Jan 25"
 * @example formatMonth("2025-01-01") // "Jan 25"
 */
export function formatMonth(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-DE', {
    month: 'short',
    year: '2-digit',
  })
}

/**
 * Format month for display (long format)
 * @param dateString - Date string in ISO format
 * @returns Full month string like "Januar 2025"
 * @example formatMonthLong("2025-01-01") // "Januar 2025"
 */
export function formatMonthLong(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('de-DE', {
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Calculate percentage change between two values
 * @param oldValue - Previous value
 * @param newValue - Current value
 * @returns Percentage change rounded to 1 decimal
 * @example calculatePercentChange(100, 150) // 50.0
 * @example calculatePercentChange(100, 80) // -20.0
 */
export function calculatePercentChange(
  oldValue: number,
  newValue: number
): number {
  if (oldValue === 0) return 0
  return Math.round(((newValue - oldValue) / oldValue) * 1000) / 10
}

/**
 * Format percentage for display
 * @param value - Percentage value
 * @param showSign - Whether to show + sign for positive values
 * @returns Formatted percentage like "+12,5%" or "-5,0%"
 * @example formatPercentage(12.5, true) // "+12,5%"
 * @example formatPercentage(-5.0) // "-5,0%"
 */
export function formatPercentage(value: number, showSign = false): string {
  const sign = value > 0 && showSign ? '+' : ''
  return `${sign}${value.toFixed(1).replace('.', ',')}%`
}

/**
 * Get month options for dropdowns (last N months)
 * @param count - Number of months to generate
 * @returns Array of {value, label} objects
 * @example getMonthOptions(3)
 * // [
 * //   { value: "2025-01-01", label: "Januar 2025" },
 * //   { value: "2024-12-01", label: "Dezember 2024" },
 * //   { value: "2024-11-01", label: "November 2024" }
 * // ]
 */
export function getMonthOptions(count: number): { value: string; label: string }[] {
  const now = new Date()
  const options: { value: string; label: string }[] = []

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
    const label = formatMonthLong(value)
    options.push({ value, label })
  }

  return options
}

/**
 * Get current month in YYYY-MM-01 format
 * @returns Current month string
 * @example getCurrentMonth() // "2025-01-01"
 */
export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Convert database amount and direction to signed value for display
 * @param amount - Amount in cents (always positive in database)
 * @param direction - "debit" (expense) or "credit" (income)
 * @returns Signed amount (negative for expenses, positive for income)
 * @example toSignedAmount(10000, 'debit') // -10000
 * @example toSignedAmount(10000, 'credit') // 10000
 */
export function toSignedAmount(amount: number, direction: 'debit' | 'credit'): number {
  return direction === 'debit' ? -amount : amount
}
