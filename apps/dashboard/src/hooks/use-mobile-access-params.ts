import { useQueryStates } from "nuqs"
import {
  createLoader,
  parseAsStringLiteral,
} from "nuqs/server"

// `mobileAccess=give` opens the give-access sheet. Bills live on /billing
// (`use-billing-params`).
export const mobileAccessParamsSchema = {
  mobileAccess: parseAsStringLiteral(["give"] as const),
}

export function useMobileAccessParams() {
  const [params, setParams] = useQueryStates(mobileAccessParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadMobileAccessParams = createLoader(mobileAccessParamsSchema)
