import { useQueryStates } from "nuqs"
import { createLoader, parseAsStringEnum } from "nuqs/server"

export const operationProfileSettingsParamsSchema = {
  operationProfileSettingsSheetType: parseAsStringEnum(["edit"]),
}

export function useOperationProfileSettingsParams() {
  const [params, setParams] = useQueryStates(operationProfileSettingsParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadOperationProfileSettingsParams = createLoader(
  operationProfileSettingsParamsSchema
)
