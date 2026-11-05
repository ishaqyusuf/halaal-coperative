import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const chargeOperationParamsSchema = {
  chargeApplicationId: parseAsString,
  chargeDefinitionId: parseAsString,
  chargeIsActive: parseAsString,
  chargeKind: parseAsString,
  chargeOperationSheetType: parseAsStringEnum([
    "definition",
    "application",
    "waive",
    "settle",
    "reverse",
    "toggle",
    "version",
  ]),
  chargeValueType: parseAsString,
}

export function useChargeOperationParams() {
  const [params, setParams] = useQueryStates(chargeOperationParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadChargeOperationParams = createLoader(
  chargeOperationParamsSchema
)
