import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringLiteral } from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"

export const notificationDeliveryStatuses = [
  "sent",
  "queued",
  "failed",
] as const

export type NotificationsFilterParams = {
  search: string | null
  status: (typeof notificationDeliveryStatuses)[number] | null
  type: string | null
}

export const notificationsFilterParamsSchema = {
  search: parseAsString,
  status: parseAsStringLiteral(notificationDeliveryStatuses),
  type: parseAsString,
}

// Shallow: the list is a client query, so a filter change needs no server render.
export function useNotificationsFilterParams() {
  const [filters, setFilters] = useQueryStates(notificationsFilterParamsSchema)

  return {
    filters,
    hasFilters: hasActiveFilters(filters, { ignoreKeys: ["search"] }),
    setFilters,
  }
}

export const loadNotificationsFilterParams = createLoader(
  notificationsFilterParamsSchema
)

/** The same list input on the server prefetch and in the browser. */
export function getNotificationDeliveryInput(filters: {
  search: string | null
  status: NotificationsFilterParams["status"]
}) {
  return {
    q: filters.search || undefined,
    status: filters.status ?? undefined,
  }
}
