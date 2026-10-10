const RECENT_SUCCESS_MS = 10_000
const TRANSIENT_ERROR_MS = 1_500

export function createStorePurchaseEventGuard(now: () => number = Date.now) {
  const inFlight = new Set<string>()
  const recentSuccess = new Map<string, number>()
  let lastSuccessAt = Number.NEGATIVE_INFINITY

  return {
    begin(key: string) {
      const previous = recentSuccess.get(key)
      if (
        inFlight.has(key) ||
        (previous !== undefined && now() - previous < RECENT_SUCCESS_MS)
      )
        return false
      inFlight.add(key)
      return true
    },
    applied(key: string) {
      lastSuccessAt = now()
      recentSuccess.set(key, lastSuccessAt)
      if (recentSuccess.size > 100) {
        const oldest = recentSuccess.keys().next().value
        if (oldest) recentSuccess.delete(oldest)
      }
    },
    done(key: string) {
      inFlight.delete(key)
    },
    hasInFlight() {
      return inFlight.size > 0
    },
    ignorePurchaseError(code: string | undefined) {
      return (
        inFlight.size > 0 ||
        (code === "service-error" && now() - lastSuccessAt < TRANSIENT_ERROR_MS)
      )
    },
  }
}
