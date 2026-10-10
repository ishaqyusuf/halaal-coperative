import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import type { MobileReadCacheState } from "@/lib/read-cache"
import { cn } from "@/lib/utils"
import { View } from "react-native"

type NoticeTone = "danger" | "neutral" | "warning"

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

export function CooperativeServiceStateNotice({
  actionLabel,
  description,
  onAction,
  reasons = [],
  title,
  tone = "warning",
}: {
  actionLabel?: string
  description?: string
  onAction?: () => void
  reasons?: string[]
  title: string
  tone?: NoticeTone
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className={cn(
        "gap-3 border-l-[3px] py-1 pl-4",
        tone === "danger" && "border-destructive",
        tone === "neutral" && "border-foreground/60",
        tone === "warning" && "border-warn"
      )}
    >
      <View className="gap-1">
        <Text className="text-xl leading-6 font-extrabold text-foreground">
          {title}
        </Text>
        {description ? (
          <Text className="text-sm leading-5 text-muted-foreground">
            {description}
          </Text>
        ) : null}
      </View>

      {reasons.length ? (
        <View>
          {reasons.map((reason, index) => (
            <View
              className={cn(
                "flex-row items-start gap-3 py-2",
                index > 0 && "border-t border-border"
              )}
              key={reason}
            >
              <View className="bg-warn mt-1.5 size-1.5 rounded-full" />
              <Text className="flex-1 text-sm leading-5 text-muted-foreground">
                {reason}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {actionLabel && onAction ? (
        <Button
          accessibilityLabel={actionLabel}
          className="self-start"
          onPress={onAction}
          size="sm"
        >
          <Icon className="size-sm text-primary-foreground" name="RefreshCw" />
          <Text>{actionLabel}</Text>
        </Button>
      ) : null}
    </View>
  )
}

export function CooperativeServiceFreshness({
  cache,
  label,
  onRefresh,
}: {
  cache: MobileReadCacheState | null | undefined
  label: string
  onRefresh: () => void
}) {
  if (!cache) return null

  if (cache.status === "live") {
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

  return (
    <CooperativeServiceStateNotice
      actionLabel="Refresh"
      description={
        isOffline
          ? `Showing saved ${label}. New requests remain unavailable until the connection returns.`
          : `Showing ${label} last verified ${formatCacheDate(cache.cachedAt)}. Refresh before starting a new request.`
      }
      onAction={onRefresh}
      title={isOffline ? "You’re offline" : "Refresh before continuing"}
    />
  )
}
