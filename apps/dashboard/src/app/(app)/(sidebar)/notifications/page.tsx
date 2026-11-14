import type { Metadata } from "next"
import { NotificationsView } from "@/components/notifications-view"
import {
  getNotificationDeliveryInput,
  loadNotificationsFilterParams,
} from "@/hooks/use-notifications-filter-params"
import { getDashboardServerContext } from "@/lib/server-context"
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server"

export const metadata: Metadata = {
  title: "Notifications | Halaalvest",
}

const emailSettingsRoles = new Set(["super_admin", "tenant_admin"])

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [filters, context] = await Promise.all([
    searchParams.then(loadNotificationsFilterParams),
    getDashboardServerContext(),
  ])
  const role = context.auth.membership?.role ?? null

  // Fire-and-forget: the list and totals stream into Suspense.
  batchPrefetch([
    trpc.notifications.summary.queryOptions(),
    trpc.notifications.deliveryHistory.infiniteQueryOptions(
      getNotificationDeliveryInput(filters),
      { getNextPageParam: ({ meta }) => meta?.cursor }
    ),
  ])

  return (
    <HydrateClient>
      <NotificationsView
        canManageEmailSettings={role ? emailSettingsRoles.has(role) : false}
        isMember={role === "member"}
      />
    </HydrateClient>
  )
}
