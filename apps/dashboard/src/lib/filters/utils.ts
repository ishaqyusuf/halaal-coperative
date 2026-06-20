export function hasActiveFilters(
  filters: Record<string, string | string[] | null | undefined>,
  options?: { ignoreKeys?: string[] },
) {
  const ignoreKeys = new Set(options?.ignoreKeys ?? [])

  return Object.entries(filters).some(([key, value]) => {
    if (ignoreKeys.has(key)) {
      return false
    }

    if (value == null || value === "") {
      return false
    }

    if (Array.isArray(value)) {
      return value.some(Boolean)
    }

    return true
  })
}

export function clearManagedFilters<T extends Record<string, unknown>>(
  keys: string[],
): Partial<Record<keyof T, null>> {
  return keys.reduce((patch, key) => {
    patch[key as keyof T] = null
    return patch
  }, {} as Partial<Record<keyof T, null>>)
}
