import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const supportCaseParamsSchema = {
  supportCaseId: parseAsString,
  supportCaseSheetType: parseAsString,
}

export function useSupportCaseParams() {
  const [params, setParams] = useQueryStates(supportCaseParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadSupportCaseParams = createLoader(supportCaseParamsSchema)
