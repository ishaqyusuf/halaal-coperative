import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const memberDetailSheetTypes = [
  "commitment",
  "document",
  "document-review",
  "kyc",
  "portal-access",
] as const

export type MemberDetailSheetType = (typeof memberDetailSheetTypes)[number]

const memberDetailParamsSchema = {
  memberDetailDocumentId: parseAsString,
  memberDetailSheetType: parseAsStringEnum([...memberDetailSheetTypes]),
}

export function useMemberDetailParams() {
  const [params, setParams] = useQueryStates(memberDetailParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadMemberDetailParams = createLoader(memberDetailParamsSchema)
