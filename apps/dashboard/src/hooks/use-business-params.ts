import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

const businessParamsSchema = {
  businessId: parseAsString,
  businessType: parseAsStringEnum([
    "create",
    "details",
    "profit",
    "edit",
    "editProfit",
    "reviewNone",
  ]),
  profitEntryId: parseAsString,
}

export function useBusinessParams() {
  const [params, setParams] = useQueryStates(businessParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadBusinessParams = createLoader(businessParamsSchema)
