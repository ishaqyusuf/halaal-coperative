import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const chargeOperationSheetTypes = [
  "details",
  "definition",
  "application",
  "waive",
  "settle",
  "reverse",
  "toggle",
  "version",
] as const

export type ChargeOperationSheetType =
  (typeof chargeOperationSheetTypes)[number]

export const chargeOperationParamsSchema = {
  chargeApplicationId: parseAsString,
  chargeDefinitionId: parseAsString,
  chargeOperationSheetType: parseAsStringEnum([...chargeOperationSheetTypes]),
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
