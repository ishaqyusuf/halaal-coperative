import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const procurementParamsSchema = {
  procurementRequestId: parseAsString,
  procurementSheetType: parseAsString,
}

export function useProcurementParams() {
  const [params, setParams] = useQueryStates(procurementParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadProcurementParams = createLoader(procurementParamsSchema)
