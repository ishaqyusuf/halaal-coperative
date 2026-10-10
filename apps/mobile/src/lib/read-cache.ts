import AsyncStorage from "@react-native-async-storage/async-storage"
import { requireMobilePersistenceScope } from "@/runtime/persistence-scope"

const READ_CACHE_PREFIX = "halaalvest_mobile_read_cache:"

export type MobileReadCacheState = {
  ageMs: number
  cachedAt: string
  reason?: "offline" | "stale"
  scope: string
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

function cacheKey(key: string, scopeKey: string) {
  return `${READ_CACHE_PREFIX}${scopeKey}:${key}`
}

export async function readCachedMobileQuery<T extends object>(
  key: string,
  query: () => Promise<T>
): Promise<T & { cache: MobileReadCacheState }> {
  const scope = requireMobilePersistenceScope()
  const scopedCacheKey = cacheKey(key, scope.key)
  try {
    const value = await query()
    const cachedAt = new Date().toISOString()

    await AsyncStorage.setItem(
      scopedCacheKey,
      JSON.stringify({
        cachedAt,
        value,
      } satisfies CachedEnvelope<T>)
    )

    return {
      ...value,
      cache: {
        ageMs: 0,
        cachedAt,
        scope: scope.key,
        status: "live",
      },
    }
  } catch (error) {
    const cachedValue = await AsyncStorage.getItem(scopedCacheKey)

    if (!cachedValue) {
      throw error
    }

    try {
      const parsed = JSON.parse(cachedValue) as CachedEnvelope<T>

      return {
        ...parsed.value,
        cache: {
          ageMs: Math.max(0, Date.now() - new Date(parsed.cachedAt).getTime()),
          cachedAt: parsed.cachedAt,
          scope: scope.key,
          status: "stale",
        },
      }
    } catch {
      await AsyncStorage.removeItem(scopedCacheKey)
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

export async function removeCachedMobileQuery(key: string) {
  await AsyncStorage.removeItem(
    cacheKey(key, requireMobilePersistenceScope().key)
  )
}
