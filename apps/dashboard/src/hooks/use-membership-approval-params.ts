import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

// The review sheet is addressed by `membershipRequestId` (not a bare
// `requestId`, which other workflows could also use).
const membershipApprovalParamsSchema = {
  membershipRequestId: parseAsString,
}

export function useMembershipApprovalParams() {
  const [params, setParams] = useQueryStates(membershipApprovalParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadMembershipApprovalParams = createLoader(
  membershipApprovalParamsSchema
)
