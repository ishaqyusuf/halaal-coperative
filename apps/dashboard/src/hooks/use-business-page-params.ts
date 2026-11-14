import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

// The /business page: which tab is open, the business search and status.
const businessPageParamsSchema = {
  q: parseAsString,
  status: parseAsStringEnum(["active", "planned", "completed", "archived"]),
  view: parseAsStringEnum(["businesses", "seasons"]).withDefault("businesses"),
}

export type BusinessPageView = "businesses" | "seasons"

export function useBusinessPageParams() {
  const [params, setParams] = useQueryStates(businessPageParamsSchema)

  return { ...params, setParams }
}

export const loadBusinessPageParams = createLoader(businessPageParamsSchema)
