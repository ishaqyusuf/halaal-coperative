import AsyncStorage from "@react-native-async-storage/async-storage"
import {
  isLegacyUnpersistableReadKey,
  MAX_PERSISTED_READ_BYTES,
} from "@/lib/read-cache-policy"
import { requireMobilePersistenceScope } from "@/runtime/persistence-scope"

export { isPersistableReadInput } from "@/lib/read-cache-policy"

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

let legacyKeysSwept: Promise<void> | null = null

function sweepLegacyReadKeys() {
  legacyKeysSwept ??= (async () => {
    const keys = await AsyncStorage.getAllKeys()
    const stale = keys.filter(
      (key) =>
        key.startsWith(READ_CACHE_PREFIX) && isLegacyUnpersistableReadKey(key)
    )
    if (stale.length > 0) await AsyncStorage.multiRemove(stale)
  })().catch(() => undefined)
  return legacyKeysSwept
}

export async function readCachedMobileQuery<T extends object>(
  key: string,
  query: () => Promise<T>,
  options: { persist?: boolean; shouldFallback?: (error: unknown) => boolean } = {}
): Promise<T & { cache: MobileReadCacheState }> {
  const scope = requireMobilePersistenceScope()
  const scopedCacheKey = cacheKey(key, scope.key)
  const persist = options.persist ?? true
  void sweepLegacyReadKeys()

  if (!persist) {
    // Searched reads and later pages are live only: no write, and no
    // offline fallback that could surface an old search.
    const value = await query()
    return {
      ...value,
      cache: {
        ageMs: 0,
        cachedAt: new Date().toISOString(),
        scope: scope.key,
        status: "live",
      },
    }
  }

  try {
    const value = await query()
    const cachedAt = new Date().toISOString()
    const serialized = JSON.stringify({
      cachedAt,
      value,
    } satisfies CachedEnvelope<T>)

    if (serialized.length <= MAX_PERSISTED_READ_BYTES) {
      await AsyncStorage.setItem(scopedCacheKey, serialized)
    } else {
      await AsyncStorage.removeItem(scopedCacheKey)
    }

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
    if (options.shouldFallback?.(error) === false) throw error
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
