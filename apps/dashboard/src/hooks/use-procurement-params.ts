import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

const procurementParamsSchema = {
  procurementRequestId: parseAsString,
  procurementSheetType: parseAsStringEnum([
    "create",
    "details",
    "purchase",
    "review",
    "self-service",
  ]),
}

export function useProcurementParams() {
  const [params, setParams] = useQueryStates(procurementParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadProcurementParams = createLoader(procurementParamsSchema)
