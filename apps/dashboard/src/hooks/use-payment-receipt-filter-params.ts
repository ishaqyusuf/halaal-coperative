import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

const paymentReceiptFilterParamsSchema = {
  q: parseAsString,
  status: parseAsString,
}

export function usePaymentReceiptFilterParams() {
  const [filter, setFilter] = useQueryStates(paymentReceiptFilterParamsSchema)

  return {
    filter,
    hasFilters: Object.values(filter).some((value) => value !== null),
    setFilter,
  }
}

export const loadPaymentReceiptFilterParams = createLoader(
  paymentReceiptFilterParamsSchema
)
