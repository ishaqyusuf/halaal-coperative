/** Payloads above this stay in memory only (AsyncStorage rows are small). */
export const MAX_PERSISTED_READ_BYTES = 256 * 1024

const SEARCH_FIELDS = ["search", "query", "q"] as const

/**
 * Only a screen's default first page is kept for the offline fallback
 * (mobile plan M4). Typed search text never reaches AsyncStorage, and
 * later pages (a cursor, or a page after the first) are not kept either.
 */
export function isPersistableReadInput(input: unknown) {
  if (!input || typeof input !== "object") return true
  const record = input as Record<string, unknown>
  for (const field of SEARCH_FIELDS) {
    const value = record[field]
    if (typeof value === "string" && value.trim().length > 0) return false
  }
  if (record.cursor !== undefined && record.cursor !== null) return false
  if (typeof record.page === "number" && record.page > 1) return false
  return true
}

/**
 * Keys persisted before M4 may still hold typed search text or later pages.
 * Matches the `JSON.stringify(input)` part of those keys.
 */
export function isLegacyUnpersistableReadKey(key: string) {
  return (
    /"(search|query|q)":"[^"]*\S[^"]*"/.test(key) ||
    /"cursor":"/.test(key) ||
    /"page":([2-9]|[1-9]\d+)/.test(key)
  )
}
