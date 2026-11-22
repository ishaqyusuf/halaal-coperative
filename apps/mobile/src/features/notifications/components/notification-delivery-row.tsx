import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import type { NotificationDelivery } from "@/features/notifications/model/notification-center-types"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { Pressable, View } from "react-native"

const dateFormat = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
})
const timeFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
})

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Time unavailable"
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return [new Date().toDateString(), yesterday.toDateString()].includes(
    date.toDateString()
  )
    ? timeFormat.format(date)
    : dateFormat.format(date)
}

const kind = {
  receipt: ["ReceiptText", "bg-tint-success", "text-tint-success-foreground"],
  financing: ["HandCoins", "bg-tint-sky", "text-tint-sky-foreground"],
  project: ["BriefcaseBusiness", "bg-tint-warm", "text-tint-warm-foreground"],
  guarantor: ["ShieldCheck", "bg-tint-lilac", "text-tint-lilac-foreground"],
  cooperative: ["Megaphone", "bg-tint-vivid", "text-tint-vivid-foreground"],
  support: ["Headphones", "bg-accent", "text-accent-foreground"],
  security: ["Shield", "bg-tint-danger", "text-tint-danger-foreground"],
  other: ["Bell", "bg-accent", "text-accent-foreground"],
} as const

function getKind(delivery: NotificationDelivery) {
  switch (delivery.action) {
    case "open_receipts":
      return kind.receipt
    case "open_financing":
      return delivery.notificationType.toLowerCase().includes("project")
        ? kind.project
        : kind.financing
    case "open_guarantors":
      return kind.guarantor
    case "open_support":
      return kind.support
    case "open_updates":
      return kind.cooperative
    case "open_security":
      return kind.security
    default:
      return kind.other
  }
}

export function notificationDeliveryActionLabel(
  delivery: NotificationDelivery
) {
  switch (delivery.action) {
    case "open_receipts":
      return "Open payment"
    case "open_guarantors":
      return "Review"
    case "open_support":
      return "Open support"
    case "open_financing":
      return "View financing"
    case "open_reports":
      return "Open report"
    case "open_security":
      return "Review security"
    default:
      return "Open"
  }
}

export function NotificationDeliveryRow({
  delivery,
  onActions,
  onOpen,
}: {
  delivery: NotificationDelivery
  onActions: (delivery: NotificationDelivery) => void
  onOpen: (delivery: NotificationDelivery) => void
}) {
  const largeTextLayout = useLargeTextLayout()
  const [icon, surface, ink] = getKind(delivery)
  const actionLabel = notificationDeliveryActionLabel(delivery)
  const failed = delivery.status === "failed"

  return (
    <Pressable
      accessibilityActions={[
        { name: "options", label: "Notification actions" },
      ]}
      accessibilityHint="Opens the related activity. Touch and hold for actions."
      accessibilityLabel={`${delivery.isRead ? "" : "Unread. "}${delivery.safeTitle}. ${delivery.safeSummary}. ${actionLabel}`}
      accessibilityRole="button"
      className="min-h-[76px] flex-row items-start gap-[12px] px-[14px] py-[14px] active:bg-muted"
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "options") onActions(delivery)
      }}
      onLongPress={() => onActions(delivery)}
      onPress={() => onOpen(delivery)}
      testID={`notification-row-${delivery.id}`}
    >
      <View
        className={cn(
          "size-[42px] shrink-0 items-center justify-center rounded-[14px]",
          delivery.isRead ? "bg-muted" : surface
        )}
      >
        <Icon
          className={cn(
            "size-[20px]",
            delivery.isRead ? "text-muted-foreground" : ink
          )}
          name={icon}
        />
      </View>
      <View className="min-w-0 flex-1 gap-[2px]">
        <Text
          className={
            delivery.isRead ? "text-secondary-foreground" : "font-bold"
          }
          numberOfLines={largeTextLayout ? undefined : 1}
          variant="body"
        >
          {delivery.safeTitle}
        </Text>
        <Text
          className="text-muted-foreground"
          numberOfLines={largeTextLayout ? undefined : 2}
          variant="small"
        >
          {delivery.safeSummary}
        </Text>
        <View className="mt-[3px] flex-row flex-wrap items-center gap-x-[6px] gap-y-[2px]">
          <Text className="text-muted-foreground" tabular variant="caption">
            {formatDate(delivery.occurredAt)}
          </Text>
          <Text className="text-muted-foreground" variant="caption">
            ·
          </Text>
          <Text
            className={
              delivery.isRead ? "text-muted-foreground" : "text-primary"
            }
            variant="caption"
          >
            {actionLabel}
          </Text>
          {failed ? (
            <View className="flex-row items-center gap-[4px]">
              <Icon
                className="size-[13px] text-tint-warm-foreground"
                name="CircleAlert"
              />
              <Text className="text-tint-warm-foreground" variant="caption">
                {delivery.channel === "push"
                  ? "Not delivered to phone"
                  : "Delivery failed"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View
        className={cn(
          "mt-[6px] size-[10px] shrink-0 rounded-full",
          !delivery.isRead && "bg-primary"
        )}
      />
    </Pressable>
  )
}
