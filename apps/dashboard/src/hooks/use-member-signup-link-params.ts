import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

const memberSignupLinkParamsSchema = {
  signupLinkId: parseAsString,
  signupLinkSheetType: parseAsStringEnum(["access", "create", "edit"]),
}

export function useMemberSignupLinkParams() {
  const [params, setParams] = useQueryStates(memberSignupLinkParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadMemberSignupLinkParams = createLoader(
  memberSignupLinkParamsSchema
)
