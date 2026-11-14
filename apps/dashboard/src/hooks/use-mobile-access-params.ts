import { useQueryStates } from "nuqs"
import {
  createLoader,
  parseAsBoolean,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server"

// `mobileAccess=give` opens the give-access sheet; `mobileInvoiceId` opens a
// bill. Paystack returns with `mobileInvoiceId` and `paystackReturn=true`.
// `remitInvoiceId` opens the platform owner's "Mark paid" dialog.
export const mobileAccessParamsSchema = {
  mobileAccess: parseAsStringLiteral(["give"] as const),
  mobileInvoiceId: parseAsString,
  paystackReturn: parseAsBoolean,
  remitInvoiceId: parseAsString,
}

export function useMobileAccessParams() {
  const [params, setParams] = useQueryStates(mobileAccessParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadMobileAccessParams = createLoader(mobileAccessParamsSchema)
