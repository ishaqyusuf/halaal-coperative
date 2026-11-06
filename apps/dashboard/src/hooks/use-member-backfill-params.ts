import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"
import { memberBackfillStepKeys } from "@/components/members/member-backfill-steps"

// Each value is a `memberBackfill` registry mode in lib/workflow-presentations.ts.
export const memberBackfillSheetTypes = [
  "adjustment",
  "apply",
  "baselineEdit",
  "cancel",
  "capture",
  "dividends",
  "historicalEntry",
  "missedMonths",
  "reverse",
  "review",
] as const

export type MemberBackfillSheetType = (typeof memberBackfillSheetTypes)[number]

const memberBackfillParamsSchema = {
  // The ledger month a cell editor (adjustment, missedMonths) opens for.
  memberBackfillMonth: parseAsString,
  memberBackfillSheetType: parseAsStringEnum([...memberBackfillSheetTypes]),
  // The opening position row, or the loan whose repayment an adjustment edits.
  memberBackfillTargetId: parseAsString,
  step: parseAsStringEnum([...memberBackfillStepKeys]),
}

export function useMemberBackfillParams() {
  const [params, setParams] = useQueryStates(memberBackfillParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadMemberBackfillParams = createLoader(memberBackfillParamsSchema)
