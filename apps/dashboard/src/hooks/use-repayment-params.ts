import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const repaymentParamsSchema = {
  loanId: parseAsString,
  repaymentId: parseAsString,
  repaymentScheduleItemId: parseAsString,
  repaymentSheetType: parseAsStringEnum([
    "post",
    "followUp",
    "scheduleDetails",
    "repaymentDetails",
  ]),
}

type RepaymentSheetOpenParams = {
  loanId?: string
  repaymentId?: string
  repaymentScheduleItemId?: string
  repaymentSheetType: "followUp" | "post" | "repaymentDetails" | "scheduleDetails"
}

export function useRepaymentParams() {
  const [params, setParams] = useQueryStates(repaymentParamsSchema)

  return {
    ...params,
    /** Opens one repayment sheet; every other repayment param is cleared. */
    open: (next: RepaymentSheetOpenParams) =>
      setParams({
        loanId: next.loanId ?? null,
        repaymentId: next.repaymentId ?? null,
        repaymentScheduleItemId: next.repaymentScheduleItemId ?? null,
        repaymentSheetType: next.repaymentSheetType,
      }),
    setParams,
  }
}

export const loadRepaymentParams = createLoader(repaymentParamsSchema)
