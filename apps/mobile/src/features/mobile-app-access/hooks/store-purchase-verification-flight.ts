export function createStorePurchaseVerificationFlight<T>() {
  const inFlight = new Map<string, Promise<T>>()

  return (key: string, verify: () => Promise<T>): Promise<T> => {
    const existing = inFlight.get(key)
    if (existing) return existing

    const pending = Promise.resolve()
      .then(verify)
      .finally(() => inFlight.delete(key))
    inFlight.set(key, pending)
    return pending
  }
}
