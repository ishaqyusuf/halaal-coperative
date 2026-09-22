import type { AnalyticsConfig } from "@ishaqyusuf/logly-core"

// Privacy-restricted browsers can throw both when retrieving localStorage and
// when reading/writing it. Analytics must never interrupt the wrapped product.
export function createSafeBrowserStorage(
  resolve: () => Storage = () => window.localStorage
): NonNullable<AnalyticsConfig["storage"]> {
  const memory = new Map<string, string>()
  return {
    getItem(key) {
      try {
        return resolve().getItem(key) ?? memory.get(key) ?? null
      } catch {
        return memory.get(key) ?? null
      }
    },
    setItem(key, value) {
      memory.set(key, value)
      try {
        resolve().setItem(key, value)
      } catch {
        /* Memory-only fallback. */
      }
    },
    removeItem(key) {
      memory.delete(key)
      try {
        resolve().removeItem(key)
      } catch {
        /* Best effort only. */
      }
    },
  }
}
