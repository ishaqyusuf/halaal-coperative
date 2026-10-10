type DraftStorage = {
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

/** Serializes autosaves/removal; closing editors may freeze until a new lifetime. */
export function createMobileFormDraftWriter(
  storage: DraftStorage,
  key: string,
  { freezeAfterClear = false }: { freezeAfterClear?: boolean } = {}
) {
  let pending = Promise.resolve()
  let cleared = false

  return {
    key,
    canHydrate: () => !cleared,
    write(value: string) {
      if (cleared) return Promise.resolve()
      const operation = pending.then(() => {
        if (!cleared) return storage.setItem(key, value)
      })
      pending = operation.catch(() => undefined)
      return operation
    },
    clear() {
      cleared = freezeAfterClear
      const operation = pending.then(() => storage.removeItem(key)).catch((error: unknown) => {
        cleared = false
        throw error
      })
      pending = operation.catch(() => undefined)
      return operation
    },
  }
}
