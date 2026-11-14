import { useQueryStates } from "nuqs"
import { createLoader, parseAsStringLiteral } from "nuqs/server"

export const mobileAccessListStatuses = [
  "pending",
  "active",
  "off",
  "declined",
  "ended",
] as const

export type MobileAccessListStatus = (typeof mobileAccessListStatuses)[number]

export const mobileAccessFilterParamsSchema = {
  accessList: parseAsStringLiteral(mobileAccessListStatuses).withDefault(
    "pending"
  ),
}

export function useMobileAccessFilterParams() {
  const [filter, setFilter] = useQueryStates(mobileAccessFilterParamsSchema)

  return { filter, setFilter }
}

export const loadMobileAccessFilterParams = createLoader(
  mobileAccessFilterParamsSchema
)
