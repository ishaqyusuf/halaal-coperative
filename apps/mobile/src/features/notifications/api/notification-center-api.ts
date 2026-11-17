import { getDevNotifications } from "@/dev/mobile-dev-fixtures"
import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import {
  readCachedMobileQuery,
  removeCachedMobileQuery,
} from "@/lib/read-cache"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import { getSessionProfile } from "@/lib/session-store"
import { visualNotificationFixture } from "../model/notification-visual-fixture"
import type { NotificationCenter } from "../model/notification-center-types"
import type { MobileNotificationCategoryKey } from "@halaalvest/domain/mobile-notifications"

const devReadIds = new Set<string>()
const devPreferenceOverrides = new Map<MobileNotificationCategoryKey, boolean>()
let devPushRegistration: NotificationCenter["pushRegistration"] = null

type FixtureOptions = { forceDevFixture?: boolean; visualFixture?: boolean }

function shouldUseDevFixture(forceDevFixture = false) {
  return isMobileDevFixtureSession() || (__DEV__ && forceDevFixture)
}

function getDevCenter(visual = false): NotificationCenter {
  const profile = getSessionProfile()
  const raw = getDevNotifications(
    profile?.cooperativeRole ??
      (profile?.role === "admin" ? "tenant_admin" : "member")
  )
  const fixture = visual
    ? visualNotificationFixture({
        ...raw,
        deliveries: raw.deliveries.map((delivery) => ({
          ...delivery,
          isRead: false,
        })),
        summary: { ...raw.summary, unread: raw.deliveries.length },
      })
    : raw
  const deliveries = fixture.deliveries.map((delivery) => ({
    ...delivery,
    isRead:
      ("isRead" in delivery && Boolean(delivery.isRead)) ||
      devReadIds.has(delivery.id),
  }))
  const preferences = fixture.preferences.map((preference) => ({
    ...preference,
    enabled: devPreferenceOverrides.get(preference.key) ?? preference.enabled,
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

export async function updateNotificationPreference(
  input: {
    enabled: boolean
    notificationType: MobileNotificationCategoryKey
  },
  options?: FixtureOptions
) {
  if (shouldUseDevFixture(options?.forceDevFixture)) {
    devPreferenceOverrides.set(input.notificationType, input.enabled)
    return input
  }
  const client = createMobileTrpcClient()
  const result =
    await client.mobile.notifications.updatePreference.mutate(input)
  await removeCachedMobileQuery("notifications")
  return result
}

export async function getNotificationCenter(options?: FixtureOptions) {
  if (shouldUseDevFixture(options?.forceDevFixture))
    return getDevCenter(options?.visualFixture)
  const client = createMobileTrpcClient()
  return readCachedMobileQuery("notifications", () =>
    client.mobile.notifications.inbox.query()
  ) as Promise<NotificationCenter>
}

/** Filtered and older pages are live only. The first inbox page is persisted. */
export async function getNotificationPage(
  input: { cursor?: string; unreadOnly: boolean },
  options?: FixtureOptions
): Promise<Pick<NotificationCenter, "deliveries" | "nextCursor">> {
  if (shouldUseDevFixture(options?.forceDevFixture)) {
    return {
      deliveries: input.cursor
        ? []
        : getDevCenter(options?.visualFixture).deliveries.filter(
            (delivery) => !input.unreadOnly || !delivery.isRead
          ),
      nextCursor: null,
    }
  }
  return createMobileTrpcClient().mobile.notifications.page.query(input)
}

export async function markAllNotificationsRead(options?: FixtureOptions) {
  if (shouldUseDevFixture(options?.forceDevFixture)) {
    const unread = getDevCenter(options?.visualFixture).deliveries.filter(
      (delivery) => !delivery.isRead
    )
    unread.forEach(({ id }) => devReadIds.add(id))
    return { markedCount: unread.length }
  }
  const result =
    await createMobileTrpcClient().mobile.notifications.markAllRead.mutate()
  await removeCachedMobileQuery("notifications")
  return result
}

export async function markNotificationsRead(
  deliveryIds: string[],
  options?: FixtureOptions
) {
  if (shouldUseDevFixture(options?.forceDevFixture)) {
    const unreadIds = [...new Set(deliveryIds)].filter(
      (id) => !devReadIds.has(id)
    )
    unreadIds.forEach((id) => devReadIds.add(id))
    return { markedCount: unreadIds.length }
  }
  const client = createMobileTrpcClient()
  const result = await client.mobile.notifications.markRead.mutate({
    deliveryIds,
  })
  await removeCachedMobileQuery("notifications")
  return result
}
