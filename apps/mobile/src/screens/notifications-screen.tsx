import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import {
  getMobileNotifications,
  type MobileNotificationDelivery,
  type MobileNotificationPreference,
  type MobileNotifications,
} from "@/lib/mobile-home-api"
import { isMockSessionToken } from "@/lib/session-store"
import { useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Time unavailable"
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatNotificationType(value: string) {
  const normalized = value.toLowerCase()

  if (normalized.includes("receipt") || normalized.includes("payment")) {
    return "Receipt updates"
  }

  if (normalized.includes("financing") || normalized.includes("loan")) {
    return "Financing updates"
  }

  if (normalized.includes("procurement")) {
    return "Procurement updates"
  }

  if (normalized.includes("food")) {
    return "Foodstuff Purchase updates"
  }

  if (normalized.includes("project")) {
    return "Project financing updates"
  }

  if (normalized.includes("share")) {
    return "Share updates"
  }

  if (normalized.includes("guarantor")) {
    return "Guarantor updates"
  }

  if (normalized.includes("support")) {
    return "Support updates"
  }

  return "Cooperative updates"
}

function DeliveryRow({ delivery }: { delivery: MobileNotificationDelivery }) {
  return (
    <View className="gap-2 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-md bg-secondary">
          <Icon name="Mail" className="size-sm text-accent" />
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-sm font-semibold text-foreground">
              {delivery.safeTitle}
            </Text>
            <StatusBadge
              label={delivery.status}
              tone={getStatusBadgeTone(delivery.status)}
            />
          </View>
          <Text className="text-sm leading-5 text-muted-foreground">
            {delivery.safeSummary}
          </Text>
          <Text className="text-xs leading-4 text-muted-foreground">
            {formatDate(delivery.occurredAt)}
          </Text>
          {delivery.errorMessage ? (
            <Text className="text-xs leading-4 text-destructive">
              {delivery.errorMessage}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  )
}

function PreferenceRow({
  preference,
}: {
  preference: MobileNotificationPreference
}) {
  return (
    <View className="flex-row items-start justify-between gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold text-foreground">
          {formatNotificationType(preference.notificationType)}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {preference.role} - {preference.channel}
        </Text>
      </View>
      <StatusBadge
        label={preference.enabled ? "On" : "Off"}
        tone={preference.enabled ? "success" : "muted"}
      />
    </View>
  )
}

export function NotificationsScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const [notifications, setNotifications] =
    useState<MobileNotifications | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canUseServerNotifications = Boolean(
    profile?.token && !isMockSessionToken(profile.token)
  )
  const stats = useMemo(
    () =>
      notifications
        ? [
            {
              detail: "Prepared for delivery",
              label: "Queued",
              value: String(notifications.summary.queued),
            },
            {
              detail: "Sent to this account",
              label: "Sent",
              value: String(notifications.summary.sent),
            },
            {
              detail: "Delivery failures",
              label: "Failed",
              value: String(notifications.summary.failed),
            },
          ]
        : [],
    [notifications]
  )

  useEffect(() => {
    let mounted = true

    if (!canUseServerNotifications) {
      setNotifications(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    void getMobileNotifications()
      .then((response) => {
        if (mounted) {
          setNotifications(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Notifications are unavailable.")
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [canUseServerNotifications, profile?.token])

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">
            Notifications
          </Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Account delivery history and cooperative notification preferences.
          </Text>
        </View>

        {!canUseServerNotifications ? (
          <SectionCard icon="Bell" title="Notification center">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production account to review notification delivery
              history.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerNotifications ? (
          <>
            <CachedReadBanner
              cache={notifications?.cache}
              label="notification data"
            />

            {stats.length ? (
              <View className="flex-row flex-wrap gap-3">
                {stats.map((item) => (
                  <StatCard key={item.label} {...item} />
                ))}
              </View>
            ) : null}

            {error ? (
              <Text className="text-sm font-medium text-destructive">
                {error}
              </Text>
            ) : null}

            <SectionCard icon="Bell" title="Delivery history">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <VirtualizedCardList
                  data={notifications?.deliveries ?? []}
                  empty={
                    <EmptyState
                      description="Account notification delivery history will appear here."
                      icon="Bell"
                      title="No notification deliveries"
                    />
                  }
                  estimatedItemSize={112}
                  keyExtractor={(delivery) => delivery.id}
                  renderItem={({ item }) => <DeliveryRow delivery={item} />}
                />
              )}
            </SectionCard>

            <SectionCard icon="SlidersHorizontal" title="Preference coverage">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <VirtualizedCardList
                  data={notifications?.preferences ?? []}
                  empty={
                    <EmptyState
                      description="Default cooperative notification routing is active."
                      icon="SlidersHorizontal"
                      title="No custom preferences"
                    />
                  }
                  estimatedItemSize={72}
                  keyExtractor={(preference) =>
                    `${preference.role}-${preference.notificationType}-${preference.channel}`
                  }
                  renderItem={({ item: preference }) => (
                    <PreferenceRow preference={preference} />
                  )}
                />
              )}
            </SectionCard>
          </>
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
