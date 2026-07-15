import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const paymentReceiptParamsSchema = {
  paymentReceiptId: parseAsString,
  paymentReceiptSheetType: parseAsString,
}

export function usePaymentReceiptParams() {
  const [params, setParams] = useQueryStates(paymentReceiptParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadPaymentReceiptParams = createLoader(
  paymentReceiptParamsSchema
)
