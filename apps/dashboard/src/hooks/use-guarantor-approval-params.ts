import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const guarantorApprovalParamsSchema = {
  guarantorApprovalId: parseAsString,
  guarantorResponseStatus: parseAsStringEnum(["approved", "rejected"]),
}

export function useGuarantorApprovalParams() {
  const [params, setParams] = useQueryStates(guarantorApprovalParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadGuarantorApprovalParams = createLoader(
  guarantorApprovalParamsSchema
)
