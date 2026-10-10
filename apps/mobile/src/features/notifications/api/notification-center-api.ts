import { getDevNotifications } from "@/dev/mobile-dev-fixtures"
import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import {
  readCachedMobileQuery,
  removeCachedMobileQuery,
} from "@/lib/read-cache"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { getSessionProfile } from "@/lib/session-store"
import type { NotificationCenter } from "../model/notification-center-types"
import type { MobileNotificationCategoryKey } from "@halaalvest/domain/mobile-notifications"

const devReadIds = new Set<string>()
const devPreferenceOverrides = new Map<MobileNotificationCategoryKey, boolean>()
let devPushRegistration: NotificationCenter["pushRegistration"] = null

function shouldUseDevFixture(forceDevFixture = false) {
  return isMobileDevFixtureSession() || (__DEV__ && forceDevFixture)
}

function getDevCenter(): NotificationCenter {
  const profile = getSessionProfile()
  const fixture = getDevNotifications(
    profile?.cooperativeRole ?? (profile?.role === "admin" ? "tenant_admin" : "member")
  )
  const deliveries = fixture.deliveries.map((delivery) => ({
    ...delivery,
    isRead: devReadIds.has(delivery.id),
  }))
  const preferences = fixture.preferences.map((preference) => ({
    ...preference,
    enabled:
      devPreferenceOverrides.get(preference.key) ?? preference.enabled,
  }))
  return {
    ...fixture,
    deliveries,
    preferences,
    pushRegistration: devPushRegistration,
    summary: {
      ...fixture.summary,
      enabledPreferences: preferences.filter((item) => item.enabled).length,
      unread: deliveries.filter((delivery) => !delivery.isRead).length,
    },
  }
}

export async function registerNotificationPush(input: {
  permissionStatus: "granted"
  platform: string
  projectId?: string | null
  providerToken: string
}) {
  if (isMobileDevFixtureSession()) {
    devPushRegistration = {
      lastValidatedAt: new Date().toISOString(),
      permissionStatus: input.permissionStatus,
      status: "registered",
    }
    return { ...devPushRegistration, id: "dev-push-registration" }
  }
  const client = createMobileTrpcClient()
  const result = await client.mobile.notifications.registerPush.mutate(input)
  await removeCachedMobileQuery("notifications")
  return result
}

export async function disableNotificationPush(
  permissionStatus: "denied" | "undetermined" | "unavailable"
) {
  if (isMobileDevFixtureSession()) {
    devPushRegistration = null
    return { disabled: true as const }
  }
  const client = createMobileTrpcClient()
  const result = await client.mobile.notifications.disablePush.mutate({
    permissionStatus,
  })
  await removeCachedMobileQuery("notifications")
  return result
}

export async function updateNotificationPreference(input: {
  enabled: boolean
  notificationType: MobileNotificationCategoryKey
}, options?: { forceDevFixture?: boolean }) {
  if (shouldUseDevFixture(options?.forceDevFixture)) {
    devPreferenceOverrides.set(input.notificationType, input.enabled)
    return input
  }
  const client = createMobileTrpcClient()
  const result = await client.mobile.notifications.updatePreference.mutate(input)
  await removeCachedMobileQuery("notifications")
  return result
}

export async function getNotificationCenter(options?: {
  forceDevFixture?: boolean
}) {
  if (shouldUseDevFixture(options?.forceDevFixture)) return getDevCenter()
  const client = createMobileTrpcClient()
  return readCachedMobileQuery("notifications", () =>
    client.mobile.notifications.overview.query()
  ) as Promise<NotificationCenter>
}

export async function markNotificationsRead(
  deliveryIds: string[],
  options?: { forceDevFixture?: boolean }
) {
  if (shouldUseDevFixture(options?.forceDevFixture)) {
    deliveryIds.forEach((id) => devReadIds.add(id))
    return { markedCount: deliveryIds.length }
  }
  const client = createMobileTrpcClient()
  const result = await client.mobile.notifications.markRead.mutate({
    deliveryIds,
  })
  await removeCachedMobileQuery("notifications")
  return result
}
