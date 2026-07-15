import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

const memberParamsSchema = {
  memberSheetType: parseAsStringEnum([
    "create",
    "details",
    "edit",
    "import",
    "status",
  ]),
  selectedMemberId: parseAsString,
  selectedMemberStatus: parseAsString,
}

export function useMemberParams() {
  const [params, setParams] = useQueryStates(memberParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadMemberParams = createLoader(memberParamsSchema)
