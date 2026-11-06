import { useQueryStates } from "nuqs"
import { createLoader, parseAsString, parseAsStringEnum } from "nuqs/server"

export const paymentReceiptSheetTypes = [
  "create",
  "member-create",
  "member-support",
  "review",
  "support",
] as const

export type PaymentReceiptSheetType = (typeof paymentReceiptSheetTypes)[number]

const paymentReceiptParamsSchema = {
  paymentReceiptId: parseAsString,
  paymentReceiptSheetType: parseAsStringEnum([...paymentReceiptSheetTypes]),
}

export function usePaymentReceiptParams() {
  // Each open and close is a history entry, so back/forward reopen and close
  // the receipt overlays.
  const [params, setParams] = useQueryStates(paymentReceiptParamsSchema, {
    history: "push",
  })

  return {
    ...params,
    setParams,
  }
}

export const loadPaymentReceiptParams = createLoader(paymentReceiptParamsSchema)
