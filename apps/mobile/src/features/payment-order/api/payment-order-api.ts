import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import {
  DEFAULT_PAYMENT_ORDER_SETTINGS,
  normalizePaymentOrderSettings,
  type PaymentOrderSettings,
} from "../model/payment-order-model"

let devSettings: PaymentOrderSettings = DEFAULT_PAYMENT_ORDER_SETTINGS

// Until lane C's admin procedures land the client type has no
// `paymentOrder` namespace; this narrow view keeps the call sites typed.
type PaymentOrderProcedures = {
  paymentOrder: {
    get: { query: (input: undefined, opts: { signal: AbortSignal }) => Promise<unknown> }
    update: { mutate: (input: PaymentOrderSettings) => Promise<unknown> }
  }
}

function procedures() {
  return createMobileTrpcClient().mobile
    .admin as unknown as PaymentOrderProcedures
}

export async function getPaymentOrderSettings({
  signal,
}: {
  signal: AbortSignal
}): Promise<PaymentOrderSettings> {
  if (isMobileDevFixtureSession()) return devSettings
  const result = await procedures().paymentOrder.get.query(undefined, { signal })
  return normalizePaymentOrderSettings(result as Partial<PaymentOrderSettings>)
}

export async function updatePaymentOrderSettings(
  input: PaymentOrderSettings,
  simulateFailure = false
): Promise<PaymentOrderSettings> {
  if (isMobileDevFixtureSession()) {
    if (simulateFailure) throw new Error("Simulated save failure")
    devSettings = input
    return devSettings
  }
  const result = await procedures().paymentOrder.update.mutate(input)
  return normalizePaymentOrderSettings(result as Partial<PaymentOrderSettings>)
}
