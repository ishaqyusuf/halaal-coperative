import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import type { MobileReadCacheState } from "@/lib/read-cache"
import { View } from "react-native"

function formatCacheDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

export function CachedReadBanner({
  action = "taking action",
  cache,
  label = "data",
}: {
  action?: string
  cache: MobileReadCacheState | null | undefined
  label?: string
}) {
  if (!cache) return null

  const isStale = cache.status === "stale"

  if (!isStale) {
    return (
      <View className="flex-row items-center gap-2">
        <View className="bg-success size-2 rounded-full" />
        <Text className="text-success text-xs font-medium">
          Updated {formatCacheDate(cache.cachedAt)}
        </Text>
      </View>
    )
  }

  const isOffline = cache.reason === "offline"
  const title = isOffline
    ? "Offline"
    : cache.reason === "stale"
      ? "Refresh needed"
      : "Saved data"

  return (
    <View className="border-warn/40 bg-warn/10 gap-1 rounded-lg border p-3">
      <View className="flex-row items-center gap-2">
        <Icon
          className="size-sm text-warn"
          name={isOffline ? "WifiOff" : "History"}
        />
        <Text className="text-sm font-semibold text-foreground">{title}</Text>
      </View>
      <Text className="text-xs leading-5 text-muted-foreground">
        {`Saved ${label} from ${formatCacheDate(cache.cachedAt)}. Refresh before ${action}.`}
      </Text>
    </View>
  )
}
