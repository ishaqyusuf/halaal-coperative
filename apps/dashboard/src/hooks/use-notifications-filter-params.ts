import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"
import { hasActiveFilters } from "@/lib/filters/utils"

export type NotificationsFilterParams = {
  search: string | null
  status: string | null
  type: string | null
}

export const notificationsFilterParamsSchema = {
  search: parseAsString,
  status: parseAsString,
  type: parseAsString,
}

export function useNotificationsFilterParams() {
  const [filters, setFilters] = useQueryStates(notificationsFilterParamsSchema, {
    shallow: false,
  })

  return {
    filters,
    hasFilters: hasActiveFilters(filters, { ignoreKeys: ["search"] }),
    setFilters,
  }
}

export const loadNotificationsFilterParams = createLoader(notificationsFilterParamsSchema)
