import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import type {
  NotificationPermissionState,
  NotificationRegistrationState,
} from "@/features/notifications/platform/notification-runtime-provider"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { View, type TextStyle } from "react-native"

function scaledTextStyle(
  accessibilityScale: number,
  fontSize: number,
  lineHeight: number,
  overrides?: Pick<TextStyle, "color" | "fontWeight">
) {
  return {
    fontSize: fontSize * accessibilityScale,
    lineHeight: lineHeight * accessibilityScale,
    ...overrides,
  }
}

export function NotificationPermissionRow({
  accessibilityScale,
  largeTextLayout,
  onEnable,
  onOpenSettings,
  onRetry,
  permissionState,
  registrationState,
}: {
  accessibilityScale: number
  largeTextLayout: boolean
  onEnable: () => void
  onOpenSettings: () => void
  onRetry: () => void
  permissionState: NotificationPermissionState
  registrationState: NotificationRegistrationState
}) {
  const colors = useColors()
  const isRegistered =
    permissionState === "granted" && registrationState === "registered"
  const isDenied = permissionState === "denied"
  const isFailed =
    permissionState === "granted" && registrationState === "failed"
  const unavailable = permissionState === "unavailable"
  const title = isRegistered
    ? "Push notifications are on"
    : isDenied
      ? "Push notifications are blocked"
      : isFailed
        ? "Push registration needs attention"
        : unavailable
          ? "Push notifications are unavailable"
          : "Push notifications are off"
  const description = isRegistered
    ? "This device can receive updates."
    : isDenied
      ? "Enable notifications in system settings."
      : "Updates still appear in this inbox."
  const action = isDenied
    ? { label: "Settings", onPress: onOpenSettings }
    : isFailed
      ? { label: "Retry", onPress: onRetry }
      : !isRegistered && !unavailable
        ? { label: "Enable", onPress: onEnable }
        : null

  return (
    <View
      accessibilityLabel={`${title}. ${description}`}
      className={cn(
        "gap-3 border-b border-border py-4",
        largeTextLayout ? "items-start" : "flex-row items-center"
      )}
    >
      <View className="size-10 shrink-0 items-center justify-center rounded-full bg-accent">
        <Icon
          className="size-sm text-accent-foreground"
          name={isRegistered ? "BellRing" : "BellOff"}
        />
      </View>
      <View
        className={cn("min-w-0", largeTextLayout ? "w-full" : "flex-1")}
      >
        <Text
          allowFontScaling={false}
          className="text-sm font-extrabold text-foreground"
          style={scaledTextStyle(accessibilityScale, 14, 20, {
            color: colors.foreground,
            fontWeight: "800",
          })}
        >
          {title}
        </Text>
        <Text
          allowFontScaling={false}
          className="mt-0.5 text-xs leading-4 text-muted-foreground"
          style={scaledTextStyle(accessibilityScale, 12, 17, {
            color: colors.mutedForeground,
          })}
        >
          {description}
        </Text>
      </View>
      {action ? (
        <Button
          className={cn(largeTextLayout && "min-h-11 self-stretch")}
          onPress={action.onPress}
          size="sm"
          variant="ghost"
        >
          <Text
            allowFontScaling={false}
            className="text-sm font-bold text-foreground"
            style={scaledTextStyle(accessibilityScale, 13, 18, {
              color: colors.foreground,
              fontWeight: "700",
            })}
          >
            {action.label}
          </Text>
        </Button>
      ) : null}
    </View>
  )
}
