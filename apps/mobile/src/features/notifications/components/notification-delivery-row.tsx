import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import type { NotificationDelivery } from "@/features/notifications/model/notification-center-types"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { Pressable, View, type TextStyle } from "react-native"

const notificationDateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
})
const notificationTimeFormatter = new Intl.DateTimeFormat("en-NG", {
  hour: "numeric",
  minute: "2-digit",
})

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

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Time unavailable"

  return date.toDateString() === new Date().toDateString()
    ? notificationTimeFormatter.format(date)
    : notificationDateFormatter.format(date)
}

function getNotificationIcon(notificationType?: string) {
  const normalized = notificationType?.toLowerCase() ?? ""
  if (normalized.includes("receipt") || normalized.includes("payment")) {
    return "ReceiptText" as const
  }
  if (normalized.includes("financing") || normalized.includes("loan")) {
    return "HandCoins" as const
  }
  if (normalized.includes("guarantor")) return "ShieldCheck" as const
  if (normalized.includes("support")) return "Headphones" as const
  if (normalized.includes("security")) return "Shield" as const
  return "Bell" as const
}

export function notificationDeliveryActionLabel(
  delivery: NotificationDelivery
) {
  if (delivery.status === "failed") return "Open in app"
  if (delivery.action === "open_receipts") return "Open receipt"
  if (delivery.action === "open_guarantors") return "Review"
  if (delivery.action === "open_support") return "Open support"
  if (delivery.action === "open_financing") return "View financing"
  if (delivery.action === "open_reports") return "Open report"
  if (delivery.action === "open_security") return "Review security"
  return "Open"
}

export function NotificationDeliveryRow({
  accessibilityScale,
  delivery,
  isLast,
  largeTextLayout,
  onOpen,
}: {
  accessibilityScale: number
  delivery: NotificationDelivery
  isLast: boolean
  largeTextLayout: boolean
  onOpen: (delivery: NotificationDelivery) => void
}) {
  const colors = useColors()
  const actionLabel = notificationDeliveryActionLabel(delivery)

  return (
    <Pressable
      accessibilityHint="Opens the related activity"
      accessibilityLabel={`${delivery.safeTitle}. ${delivery.safeSummary}. ${actionLabel}`}
      accessibilityRole="button"
      className={cn(
        "relative flex-row items-start gap-3 active:bg-accent/40",
        largeTextLayout ? "py-5" : "min-h-24 py-4"
      )}
      onPress={() => onOpen(delivery)}
      testID={`notification-row-${delivery.id}`}
    >
      <View
        className={cn(
          "size-10 shrink-0 items-center justify-center rounded-full",
          delivery.status === "failed" ? "bg-warn/10" : "bg-accent"
        )}
      >
        <Icon
          className={cn(
            "size-sm",
            delivery.status === "failed"
              ? "text-warn"
              : "text-accent-foreground"
          )}
          name={getNotificationIcon(delivery.notificationType)}
        />
      </View>
      <View className="min-w-0 flex-1 gap-1">
        <Text
          allowFontScaling={false}
          className="text-sm font-extrabold text-foreground"
          style={scaledTextStyle(accessibilityScale, 14, 20, {
            color: colors.foreground,
            fontWeight: "800",
          })}
        >
          {delivery.safeTitle}
        </Text>
        <Text
          allowFontScaling={false}
          className="text-sm leading-5 text-muted-foreground"
          style={scaledTextStyle(accessibilityScale, 13, 19, {
            color: colors.mutedForeground,
          })}
        >
          {delivery.safeSummary}
        </Text>
        <View
          className={cn(
            "gap-1 pt-0.5",
            largeTextLayout ? "items-start" : "flex-row flex-wrap items-center"
          )}
        >
          <Text
            allowFontScaling={false}
            className="text-xs font-semibold text-muted-foreground"
            style={scaledTextStyle(accessibilityScale, 11, 16, {
              color: colors.mutedForeground,
              fontWeight: "600",
            })}
          >
            {formatDate(delivery.occurredAt)}
          </Text>
          <Text
            allowFontScaling={false}
            className={cn(
              "text-xs font-extrabold",
              delivery.status === "failed"
                ? "text-destructive"
                : "text-brand"
            )}
            style={scaledTextStyle(accessibilityScale, 11, 16, {
              color:
                delivery.status === "failed"
                  ? colors.destructive
                  : colors.brand,
              fontWeight: "800",
            })}
          >
            {largeTextLayout ? actionLabel : `· ${actionLabel}`}
          </Text>
        </View>
      </View>
      {!delivery.isRead ? (
        <View
          accessibilityLabel="Unread"
          className="mt-1.5 size-2 shrink-0 rounded-full bg-brand"
        />
      ) : null}
      {!isLast ? (
        <View className="absolute right-0 bottom-0 left-[52px] h-px bg-border" />
      ) : null}
    </Pressable>
  )
}
