const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDate(date: Date): string {
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

export function formatDay(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`
}

export function errorSearch(search: Record<string, unknown>): { error?: string } {
  return typeof search.error === 'string' ? { error: search.error } : {}
}
