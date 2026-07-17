import { cooperativeRoles, getRoleDisplayName } from "@halaalvest/auth/roles"
import {
  getNotificationFilterMetadata,
  listNotificationPreferences,
} from "@halaalvest/db"
import { halaalVestNotificationTypeList } from "@halaalvest/notifications"
import { NotificationsView } from "@/components/notifications-view"
import { loadNotificationPreferenceParams } from "@/hooks/use-notification-preference-params"
import { loadNotificationsFilterParams } from "@/hooks/use-notifications-filter-params"
import { loadSortParams } from "@/hooks/use-sort-params"
import { getDashboardServerContext } from "@/lib/server-context"
import {
  getQueryClient,
  getServerCaller,
  HydrateClient,
  trpc,
} from "@/trpc/server"
import { getInitialTableSettings } from "@/utils/columns"
import { getEnumValue } from "@/utils/enum"

const managedNotificationTypes = halaalVestNotificationTypeList

type NotificationSortField =
  | "createdAt"
  | "notificationType"
  | "recipient"
  | "status"
  | "subject"

function getSort(
  sort?: string[] | null
): [NotificationSortField, "asc" | "desc"] | null {
  if (!sort || sort.length !== 2) return null

  const field = sort[0]
  const direction = sort[1]
  if (!field || !direction) return null

  const validFields = new Set<string>([
    "createdAt",
    "notificationType",
    "recipient",
    "status",
    "subject",
  ])

  if (!validFields.has(field)) return null
  if (direction !== "asc" && direction !== "desc") return null

  return [field as NotificationSortField, direction]
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  const filters = loadNotificationsFilterParams(resolvedSearchParams)
  loadNotificationPreferenceParams(resolvedSearchParams)
  const { sort } = loadSortParams(resolvedSearchParams)
  const context = await getDashboardServerContext()
  const search = filters.search ?? ""
  const status = filters.status ?? ""
  const type = filters.type ?? ""
  const deliveryHistoryInput = {
    q: search || undefined,
    sort: getSort(sort),
    status: getEnumValue(status, ["failed", "queued", "sent"] as const),
    type: type || undefined,
  }

  const [filterList, preferences, initialTableSettings, caller] =
    await Promise.all([
      context.tenant
        ? getNotificationFilterMetadata(context.tenant.id)
        : Promise.resolve([]),
      context.tenant
        ? listNotificationPreferences(context.tenant.id)
        : Promise.resolve([]),
      getInitialTableSettings("notifications"),
      getServerCaller(),
    ])
  const initialDeliveryPage = context.tenant
    ? await caller.notifications.deliveryHistory(deliveryHistoryInput)
    : { data: [], meta: { cursor: undefined, preferenceCount: 0, total: 0 } }
  const deliveryHistoryOptions =
    trpc.notifications.deliveryHistory.infiniteQueryOptions(
      deliveryHistoryInput,
      {
        getNextPageParam: ({ meta }) => meta?.cursor,
      }
    )

  getQueryClient().setQueryData(deliveryHistoryOptions.queryKey, {
    pageParams: [deliveryHistoryOptions.initialPageParam],
    pages: [initialDeliveryPage],
  })

  const roleOptions: Array<(typeof cooperativeRoles)[number] | "all"> = [
    "all",
    ...cooperativeRoles,
  ]
  const preferenceKeys = new Set(
    preferences
      .filter((preference) => preference.enabled)
      .map(
        (preference) =>
          `${preference.role ?? "all"}:${preference.notificationType}:${preference.channel}`
      )
  )
  const preferenceToggles = managedNotificationTypes.flatMap(
    (notificationType) =>
      roleOptions.map((roleKey) => {
        const role = roleKey === "all" ? null : roleKey
        const enabled = preferenceKeys.has(
          `${role ?? "all"}:${notificationType}:email`
        )

        return {
          enabled,
          label: role ? getRoleDisplayName(role) : "All roles",
          notificationType,
          role,
        }
      })
  )
  const notificationTypeCounts = Array.from(
    initialDeliveryPage.data.reduce((map, entry) => {
      const notificationType = entry.notificationType
      map.set(notificationType, (map.get(notificationType) ?? 0) + 1)
      return map
    }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const failureReasons = Array.from(
    initialDeliveryPage.data
      .filter((entry) => entry.deliveryStatus === "failed")
      .reduce((map, entry) => {
        const reason = entry.action
        map.set(reason, (map.get(reason) ?? 0) + 1)
        return map
      }, new Map<string, number>())
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  const sentCount = initialDeliveryPage.data.filter(
    (entry) => entry.deliveryStatus === "sent"
  ).length
  const preparedCount = initialDeliveryPage.data.filter(
    (entry) => entry.deliveryStatus === "queued"
  ).length
  const failedCount = initialDeliveryPage.data.filter(
    (entry) => entry.deliveryStatus === "failed"
  ).length
  const lastSentAt =
    initialDeliveryPage.data.find((entry) => entry.deliveryStatus === "sent")
      ?.occurredAt ?? null

  return (
    <HydrateClient>
      <NotificationsView
        failedCount={failedCount}
        failureReasons={failureReasons}
        filterList={filterList}
        initialTableSettings={initialTableSettings}
        lastSentDateLabel={lastSentAt?.toISOString().slice(0, 10) ?? null}
        managedNotificationTypes={managedNotificationTypes}
        notificationTypeCounts={notificationTypeCounts}
        preferenceToggles={preferenceToggles}
        preparedCount={preparedCount}
        sentCount={sentCount}
        totalEntries={initialDeliveryPage.meta.total}
      />
    </HydrateClient>
  )
}
