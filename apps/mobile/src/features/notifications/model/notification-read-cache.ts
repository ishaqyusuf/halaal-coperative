import { appQueryKey } from "@/hooks/use-app-query"
import type { getSessionProfile } from "@/lib/session-store"
import type { InfiniteData, QueryClient } from "@tanstack/react-query"
import type {
  NotificationCenter,
  NotificationDelivery,
} from "./notification-center-types"

type InboxProfile = NonNullable<ReturnType<typeof getSessionProfile>>

export type NotificationPage = Pick<
  NotificationCenter,
  "deliveries" | "nextCursor"
>
export type InboxPage = NotificationPage | NotificationCenter

export function getInboxCenter(data?: InfiniteData<InboxPage>) {
  const first = data?.pages[0]
  return first && "summary" in first ? first : undefined
}

export function notificationQueryKeys(
  profile: InboxProfile | null,
  fixtureScope: string | null = null
) {
  const scope = [
    profile?.tenant.id,
    profile?.user.id,
    profile?.activeMembershipId,
  ]
  return {
    inbox: appQueryKey("notifications", "inbox", ...scope, fixtureScope),
    memberHome: appQueryKey("member-core", "home", ...scope),
    unread: appQueryKey("notifications", "unread", ...scope, fixtureScope),
  }
}

export async function updateNotificationReadCache(
  client: QueryClient,
  keys: ReturnType<typeof notificationQueryKeys>,
  deliveryIds: readonly string[] | "all",
  markedCount: number
) {
  const { inbox, memberHome, unread } = keys
  await Promise.all(
    [inbox, unread, memberHome].map((queryKey) =>
      client.cancelQueries({ exact: true, queryKey })
    )
  )
  const ids = new Set(deliveryIds === "all" ? [] : deliveryIds)
  const wasMarked = (delivery: NotificationDelivery) =>
    deliveryIds === "all" || ids.has(delivery.id)
  const mark = (deliveries: NotificationDelivery[]) =>
    deliveries.map((delivery) =>
      !delivery.isRead && wasMarked(delivery)
        ? { ...delivery, isRead: true }
        : delivery
    )
  const loaded =
    client
      .getQueryData<InfiniteData<InboxPage>>(inbox)
      ?.pages.flatMap((page) => page.deliveries) ?? []
  const statusById = new Map(loaded.map(({ id, isRead }) => [id, isRead]))
  const knownUnread = [...ids].filter(
    (id) => statusById.get(id) === false
  ).length
  const unknown = [...ids].filter((id) => !statusById.has(id)).length
  const decrement = knownUnread + Math.min(unknown, markedCount)
  const decrease = (previous: number) =>
    deliveryIds === "all" ? 0 : Math.max(0, previous - decrement)
  const updated = client.setQueryData<InfiniteData<InboxPage>>(
    inbox,
    (current) =>
      current && {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          deliveries: mark(page.deliveries),
          ...("summary" in page
            ? {
                summary: {
                  ...page.summary,
                  unread: decrease(page.summary.unread),
                },
              }
            : {}),
        })),
      }
  )
  const center = getInboxCenter(updated)

  client.setQueryData<InfiniteData<NotificationPage>>(
    unread,
    (current) =>
      current && {
        ...current,
        pages: current.pages.map((page) => ({
          ...page,
          deliveries: page.deliveries.filter(
            (delivery) => !wasMarked(delivery)
          ),
          nextCursor: center?.summary.unread === 0 ? null : page.nextCursor,
        })),
      }
  )

  if (deliveryIds !== "all" && !decrement) return
  client.setQueryData<{ notifications?: { unread: number } }>(
    memberHome,
    (current) =>
      current && {
        ...current,
        notifications: {
          unread:
            center?.summary.unread ??
            decrease(current.notifications?.unread ?? 0),
        },
      }
  )
}
