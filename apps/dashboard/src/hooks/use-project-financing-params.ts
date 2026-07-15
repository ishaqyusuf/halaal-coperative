import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const projectFinancingParamsSchema = {
  projectFinancingRequestId: parseAsString,
  projectFinancingSheetType: parseAsString,
}

export function useProjectFinancingParams() {
  const [params, setParams] = useQueryStates(projectFinancingParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadProjectFinancingParams = createLoader(
  projectFinancingParamsSchema
)
