import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useLocalSearchParams } from "expo-router"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import {
  getNotificationCenter,
  markNotificationsRead,
  updateNotificationPreference,
} from "../api/notification-center-api"
import type { NotificationCenterQaState } from "../model/notification-center-types"
import type {
  NotificationCenter,
  NotificationDelivery,
  NotificationPreference,
} from "../model/notification-center-types"
import { presentNotificationCenterForQa } from "../model/notification-center-qa"
import { resolveNotificationDestination } from "../model/notification-destination-registry"
import { useNotificationRuntime } from "../platform/notification-runtime-provider"
import { NotificationsScreen } from "../screens/notifications-screen"
import type { MobileNotificationRole } from "@halaalvest/domain/mobile-notifications"

function getQaState(value: string | string[] | undefined) {
  if (!__DEV__ || typeof value !== "string") return null
  return [
    "denied",
    "empty",
    "error",
    "failed",
    "fixture",
    "loading",
    "offline",
    "queued",
    "stale",
  ].includes(value)
    ? (value as NotificationCenterQaState)
    : null
}

export function NotificationsRouteController() {
  const { profile } = useAuthContext()
  const router = useRouter()
  const runtime = useMobileRuntime()
  const notificationRuntime = useNotificationRuntime()
  const { qaState } = useLocalSearchParams<{
    qaState?: string | string[]
  }>()
  const resolvedQaState = getQaState(qaState)
  const forceDevFixture = resolvedQaState === "fixture"
  const [notifications, setNotifications] = useState<NotificationCenter | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isMarkingRead, setIsMarkingRead] = useState(false)
  const [isUpdatingPreference, setIsUpdatingPreference] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [destinationError, setDestinationError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const canUseServerNotifications =
    resolvedQaState !== "denied" && profile
      ? canUseMobileFeatureData(profile, profile.role)
      : false
  const canMutateNotifications =
    resolvedQaState !== "offline" &&
    resolvedQaState !== "stale" &&
    runtime.state.connectivity === "online" &&
    notifications?.cache?.status !== "stale"

  useEffect(() => {
    let mounted = true

    if (!canUseServerNotifications) {
      setNotifications(null)
      setError(null)
      setIsLoading(false)
      return
    }

    if (resolvedQaState === "error") {
      setNotifications(null)
      setError("Notifications are unavailable.")
      setIsLoading(false)
      return
    }

    if (resolvedQaState === "loading") {
      setNotifications(null)
      setError(null)
      setIsLoading(true)
      return
    }

    setIsLoading(true)
    setError(null)

    void getNotificationCenter({ forceDevFixture })
      .then((response) => {
        if (mounted) {
          setNotifications(
            presentNotificationCenterForQa(response, resolvedQaState)
          )
        }
      })
      .catch(() => {
        if (mounted) setError("Notifications are unavailable.")
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [
    canUseServerNotifications,
    forceDevFixture,
    profile?.token,
    refreshKey,
    resolvedQaState,
  ])

  async function handleMarkRead(deliveryIds: string[]) {
    if (!deliveryIds.length || isMarkingRead || !canMutateNotifications) return
    setIsMarkingRead(true)
    setError(null)

    try {
      await runtime.runOnlineOperation("command", () =>
        markNotificationsRead(deliveryIds, { forceDevFixture })
      )
      const markedIds = new Set(deliveryIds)
      setNotifications((current) => {
        if (!current) return current
        const newlyRead = current.deliveries.filter(
          (delivery) => !delivery.isRead && markedIds.has(delivery.id)
        ).length
        return {
          ...current,
          deliveries: current.deliveries.map((delivery) =>
            markedIds.has(delivery.id)
              ? { ...delivery, isRead: true }
              : delivery
          ),
          summary: {
            ...current.summary,
            unread: Math.max(0, current.summary.unread - newlyRead),
          },
        }
      })

      try {
        setNotifications(await getNotificationCenter({ forceDevFixture }))
      } catch {
        setError("Read state saved. Refresh when the connection is restored.")
      }
    } catch {
      setError("Notification read state could not be synchronized.")
    } finally {
      setIsMarkingRead(false)
    }
  }

  function handleOpenDelivery(delivery: NotificationDelivery) {
    if (!profile) return
    const intendedRole =
      delivery.intendedRole ??
      ((profile.cooperativeRole ?? profile.role) as MobileNotificationRole)
    const result = resolveNotificationDestination(
      {
        action: delivery.action,
        ...(delivery.entityId ? { entityId: delivery.entityId } : {}),
        intendedRole,
        notificationId: delivery.id,
        tenantId: profile.tenant.id,
        version: 1,
      },
      profile
    )
    if (!result.ok) {
      setDestinationError(result.message)
      return
    }
    setDestinationError(null)
    router.push(result.href as never)
    if (!delivery.isRead) void handleMarkRead([delivery.id])
  }

  async function handleUpdatePreference(
    preference: NotificationPreference,
    enabled: boolean
  ) {
    if (
      preference.mandatory ||
      isUpdatingPreference ||
      !canMutateNotifications
    ) {
      return
    }
    setIsUpdatingPreference(true)
    setError(null)
    try {
      await runtime.runOnlineOperation("command", () =>
        updateNotificationPreference({
          enabled,
          notificationType: preference.key,
        }, { forceDevFixture })
      )
      setNotifications((current) => {
        if (!current) return current
        const preferences = current.preferences.map((item) =>
          item.key === preference.key ? { ...item, enabled } : item
        )
        return {
          ...current,
          preferences,
          summary: {
            ...current.summary,
            enabledPreferences: preferences.filter((item) => item.enabled)
              .length,
          },
        }
      })
    } catch {
      setError("Notification setting could not be saved.")
    } finally {
      setIsUpdatingPreference(false)
    }
  }

  return (
    <NotificationsScreen
      canMutateNotifications={canMutateNotifications}
      canUseServerNotifications={canUseServerNotifications}
      destinationError={
        destinationError ?? notificationRuntime.destinationError
      }
      error={error}
      isLoading={isLoading}
      isMarkingRead={isMarkingRead}
      isSignedIn={Boolean(profile)}
      isUpdatingPreference={isUpdatingPreference}
      notifications={notifications}
      onBack={() => router.back()}
      onClearDestinationError={() => {
        setDestinationError(null)
        notificationRuntime.clearDestinationError()
      }}
      onEnablePush={() => void notificationRuntime.requestPermission()}
      onMarkRead={(deliveryIds) => void handleMarkRead(deliveryIds)}
      onOpenDelivery={handleOpenDelivery}
      onOpenSystemSettings={() => void notificationRuntime.openSystemSettings()}
      onRetry={() => setRefreshKey((value) => value + 1)}
      onRetryRegistration={() => void notificationRuntime.retryRegistration()}
      onUpdatePreference={(preference, enabled) =>
        void handleUpdatePreference(preference, enabled)
      }
      permissionState={notificationRuntime.permissionState}
      registrationState={notificationRuntime.registrationState}
    />
  )
}
