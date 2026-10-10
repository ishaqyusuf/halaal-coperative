import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

const projectFinancingParamsSchema = {
  projectFinancingRequestId: parseAsString,
  projectFinancingSheetType: parseAsStringEnum([
    "create",
    "details",
    "disbursement",
    "review",
    "self-service",
  ]),
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
