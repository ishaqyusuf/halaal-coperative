import { useQueryStates } from "nuqs"
import { createLoader, parseAsBoolean, parseAsString } from "nuqs/server"

// `billId` opens a Halaalvest bill on /billing; Paystack returns with `billId`
// and `paystackReturn=true`. `remitBillId` opens the platform owner's
// "Mark paid" dialog on /platform/bills.
export const billingParamsSchema = {
  billId: parseAsString,
  paystackReturn: parseAsBoolean,
  remitBillId: parseAsString,
}

export function useBillingParams() {
  const [params, setParams] = useQueryStates(billingParamsSchema)
  return { ...params, setParams }
}

export const loadBillingParams = createLoader(billingParamsSchema)
