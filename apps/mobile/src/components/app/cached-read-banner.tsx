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
  cache,
  label = "data",
}: {
  cache: MobileReadCacheState | null | undefined
  label?: string
}) {
  if (!cache) return null

  const isStale = cache.status === "stale"

  return (
    <View
      className={`gap-1 rounded-md border p-3 ${
        isStale
          ? "border-warning/40 bg-warning/10"
          : "border-border bg-secondary"
      }`}
    >
      <View className="flex-row items-center gap-2">
        <Icon
          name={isStale ? "WifiOff" : "CloudCheck"}
          className={`size-sm ${isStale ? "text-warning" : "text-success"}`}
        />
        <Text className="text-sm font-semibold text-foreground">
          {isStale ? "Offline snapshot" : "Data refreshed"}
        </Text>
      </View>
      <Text className="text-xs leading-5 text-muted-foreground">
        {isStale
          ? `Showing cached ${label} from ${formatCacheDate(cache.cachedAt)}. Refresh before submitting approvals, postings, role changes, or financial requests.`
          : `Updated ${formatCacheDate(cache.cachedAt)}.`}
      </Text>
    </View>
  )
}
