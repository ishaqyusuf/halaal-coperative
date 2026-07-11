import AsyncStorage from "@react-native-async-storage/async-storage"

const READ_CACHE_PREFIX = "halaalvest_mobile_read_cache:"

export type MobileReadCacheState = {
  cachedAt: string
  status: "live" | "stale"
}

export function isMobileReadCacheStale(
  cache: MobileReadCacheState | null | undefined
) {
  return cache?.status === "stale"
}

type CachedEnvelope<T> = {
  cachedAt: string
  value: T
}

function cacheKey(key: string) {
  return `${READ_CACHE_PREFIX}${key}`
}

export async function readCachedMobileQuery<T extends object>(
  key: string,
  query: () => Promise<T>
): Promise<T & { cache: MobileReadCacheState }> {
  try {
    const value = await query()
    const cachedAt = new Date().toISOString()

    await AsyncStorage.setItem(
      cacheKey(key),
      JSON.stringify({
        cachedAt,
        value,
      } satisfies CachedEnvelope<T>)
    )

    return {
      ...value,
      cache: {
        cachedAt,
        status: "live",
      },
    }
  } catch (error) {
    const cachedValue = await AsyncStorage.getItem(cacheKey(key))

    if (!cachedValue) {
      throw error
    }

    try {
      const parsed = JSON.parse(cachedValue) as CachedEnvelope<T>

      return {
        ...parsed.value,
        cache: {
          cachedAt: parsed.cachedAt,
          status: "stale",
        },
      }
    } catch {
      await AsyncStorage.removeItem(cacheKey(key))
      throw error
    }
  }
}

export async function clearMobileReadCache() {
  const keys = await AsyncStorage.getAllKeys()
  const cacheKeys = keys.filter((key) => key.startsWith(READ_CACHE_PREFIX))

  if (cacheKeys.length > 0) {
    await AsyncStorage.multiRemove(cacheKeys)
  }
}
