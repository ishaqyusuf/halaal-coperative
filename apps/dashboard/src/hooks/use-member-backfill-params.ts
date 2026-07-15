import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"
import { memberBackfillStepKeys } from "@/components/members/member-backfill-steps"

const memberBackfillParamsSchema = {
  memberBackfillSheetType: parseAsString,
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
