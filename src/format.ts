// Fixed UTC formatting so server-rendered and hydrated text match.
export function formatDate(date: Date): string {
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`
}

export function errorSearch(search: Record<string, unknown>): { error?: string } {
  return typeof search.error === 'string' ? { error: search.error } : {}
}
