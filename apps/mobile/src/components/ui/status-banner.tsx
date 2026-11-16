import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { ActivityIndicator, View } from "react-native"
import { useColors } from "@/hooks/use-color"

export type StatusBannerKind = "offline" | "stale" | "error" | "info"

const KIND: Record<
  StatusBannerKind,
  { icon: string; surface: string; text: string; role: "alert" | "summary" }
> = {
  offline: {
    icon: "WifiOff",
    role: "alert",
    surface: "bg-tint-warm",
    text: "text-tint-warm-foreground",
  },
  stale: {
    icon: "History",
    role: "summary",
    surface: "bg-tint-sky",
    text: "text-tint-sky-foreground",
  },
  error: {
    icon: "CircleAlert",
    role: "alert",
    surface: "bg-tint-danger",
    text: "text-tint-danger-foreground",
  },
  info: {
    icon: "Info",
    role: "summary",
    surface: "bg-accent",
    text: "text-accent-foreground",
  },
}

/**
 * Inline status for a screen or list: offline ("Showing entries saved at
 * 7:48 PM"), stale, or an error, with an optional Retry pill. Radius 18.
 */
export function StatusBanner({
  className,
  description,
  kind,
  onRetry,
  retrying = false,
  retryLabel = "Retry",
  title,
}: {
  className?: string
  description?: string
  kind: StatusBannerKind
  onRetry?: () => void
  retrying?: boolean
  retryLabel?: string
  title: string
}) {
  const colors = useColors()
  const config = KIND[kind]
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole={config.role}
      className={cn(
        "flex-row items-center gap-3 rounded-[18px] px-[14px] py-3",
        config.surface,
        className
      )}
    >
      <Icon className={cn("size-base self-start mt-0.5", config.text)} name={config.icon} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className={config.text} variant="label">
          {title}
        </Text>
        {description ? (
          <Text className={config.text} variant="small">
            {description}
          </Text>
        ) : null}
      </View>
      {onRetry ? (
        <Pressable
          accessibilityLabel={`${retryLabel}: ${title}`}
          accessibilityRole="button"
          className="min-h-11 min-w-[72px] items-center justify-center rounded-full bg-card px-4"
          disabled={retrying}
          haptic
          onPress={onRetry}
        >
          {retrying ? (
            <ActivityIndicator color={colors.foreground} size="small" />
          ) : (
            <Text className="text-foreground" variant="label">
              {retryLabel}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  )
}
