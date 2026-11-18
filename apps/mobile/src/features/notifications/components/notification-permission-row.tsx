import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import type {
  NotificationPermissionState,
  NotificationRegistrationState,
} from "@/features/notifications/platform/notification-runtime-provider"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { ActivityIndicator, Pressable, View } from "react-native"
import { useColors } from "@/hooks/use-color"

export type NotificationPushControls = {
  disabled: boolean
  onEnable: () => void
  onOpenSettings: () => void
  onRetry: () => void
  permissionState: NotificationPermissionState
  registrationState: NotificationRegistrationState
}

export function pushPresentation(
  permission: NotificationPermissionState,
  registration: NotificationRegistrationState
) {
  if (permission === "denied") return "denied"
  if (permission === "unavailable") return "unavailable"
  if (permission === "granted") {
    if (registration === "registered") return "on"
    if (registration === "failed") return "failed"
  }
  return "off"
}

const PRESENTATION = {
  on: {
    icon: "BellRing",
    surface: "bg-tint-success",
    ink: "text-tint-success-foreground",
    title: "",
    description: "",
    detail: "On · alerts arrive on this phone",
    action: null,
  },
  off: {
    icon: "BellRing",
    surface: "bg-accent",
    ink: "text-accent-foreground",
    title: "Get alerts on this phone",
    description: "Turn on push for receipts, financing and security alerts.",
    detail: "Off · alerts stay in your inbox",
    action: "Turn on",
  },
  denied: {
    icon: "BellOff",
    surface: "bg-tint-warm",
    ink: "text-tint-warm-foreground",
    title: "Push is blocked",
    description: "Allow notifications for HalaalVest in your phone settings.",
    detail: "Blocked in phone settings",
    action: "Open Settings",
  },
  failed: {
    icon: "CircleAlert",
    surface: "bg-tint-danger",
    ink: "text-tint-danger-foreground",
    title: "This phone isn’t registered",
    description: "Alerts can’t reach this phone yet.",
    detail: "Couldn’t register this phone",
    action: "Retry",
  },
  unavailable: {
    icon: "BellOff",
    surface: "bg-muted",
    ink: "text-muted-foreground",
    title: "Push isn’t available here",
    description: "Alerts still arrive in this inbox.",
    detail: "Unavailable on this device",
    action: null,
  },
} as const

export function NotificationPermissionRow({
  disabled,
  onEnable,
  onOpenSettings,
  onRetry,
  permissionState,
  registrationState,
  inSettings = false,
  onDismiss,
}: NotificationPushControls & {
  inSettings?: boolean
  onDismiss?: () => void
}) {
  const colors = useColors()
  const largeText = useLargeTextLayout()
  const state = pushPresentation(permissionState, registrationState)
  const config = PRESENTATION[state]
  const busy = registrationState === "registering"
  if (state === "on" && !inSettings) return null
  return (
    <View
      className={cn(
        "gap-[12px] px-[14px]",
        largeText ? "items-start" : "flex-row items-center",
        inSettings
          ? "min-h-[64px] py-[11px]"
          : cn("rounded-[20px] py-[14px]", config.surface)
      )}
    >
      <View
        className={cn(
          "size-[40px] shrink-0 items-center justify-center",
          inSettings
            ? cn("rounded-[14px]", config.surface)
            : "rounded-full bg-card"
        )}
      >
        <Icon name={config.icon} className={cn("size-[20px]", config.ink)} />
      </View>
      <View className={cn("min-w-0 gap-[2px]", !largeText && "flex-1")}>
        <Text
          className={inSettings ? "font-bold" : "text-[14px]"}
          variant={inSettings ? "body" : "label"}
        >
          {inSettings ? "Push on this phone" : config.title}
        </Text>
        <Text
          className="text-[13px] leading-[18px] text-muted-foreground"
          variant="small"
        >
          {inSettings ? config.detail : config.description}
        </Text>
      </View>
      {config.action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy, disabled }}
          className="min-h-[40px] shrink-0 items-center justify-center rounded-full bg-primary px-[12px] disabled:opacity-50"
          disabled={busy || (disabled && state !== "denied")}
          hitSlop={2}
          onPress={
            state === "denied"
              ? onOpenSettings
              : state === "failed"
                ? onRetry
                : onEnable
          }
        >
          {busy ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text className="text-primary-foreground" variant="label">
              {config.action}
            </Text>
          )}
        </Pressable>
      ) : state === "on" && inSettings ? (
        <View className="min-h-[26px] shrink-0 flex-row items-center gap-[5px] rounded-full bg-tint-success px-[10px]">
          <Icon
            className="size-[13px] text-tint-success-foreground"
            name="Check"
          />
          <Text className="text-tint-success-foreground" variant="caption">
            On
          </Text>
        </View>
      ) : null}
      {onDismiss && state === "off" ? (
        <Pressable
          accessibilityLabel="Not now"
          accessibilityRole="button"
          hitSlop={12}
          onPress={onDismiss}
        >
          <Icon className="size-[16px] text-muted-foreground" name="X" />
        </Pressable>
      ) : null}
    </View>
  )
}
