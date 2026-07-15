import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const repaymentParamsSchema = {
  repaymentScheduleItemId: parseAsString,
  repaymentSheetType: parseAsStringEnum(["refresh", "post", "followUp"]),
}

export function useRepaymentParams() {
  const [params, setParams] = useQueryStates(repaymentParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadRepaymentParams = createLoader(repaymentParamsSchema)
