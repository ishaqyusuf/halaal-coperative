import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import {
  DEFAULT_PAYMENT_ORDER_SETTINGS,
  normalizePaymentOrderSettings,
  type PaymentOrderSettings,
} from "../model/payment-order-model"

let devSettings: PaymentOrderSettings = DEFAULT_PAYMENT_ORDER_SETTINGS

export async function getPaymentOrderSettings({
  signal,
}: {
  signal: AbortSignal
}): Promise<PaymentOrderSettings> {
  if (isMobileDevFixtureSession()) return devSettings
  const client = createMobileTrpcClient()
  const result = await client.mobile.admin.paymentOrder.get.query(undefined, {
    signal,
  })
  return normalizePaymentOrderSettings(result)
}

export async function updatePaymentOrderSettings(
  input: PaymentOrderSettings,
  simulateFailure = false
): Promise<PaymentOrderSettings> {
  // Dev QA `save-error`: fail once before any request leaves the device.
  if (simulateFailure) throw new Error("Simulated save failure")
  if (isMobileDevFixtureSession()) {
    devSettings = input
    return devSettings
  }
  const client = createMobileTrpcClient()
  const result = await client.mobile.admin.paymentOrder.update.mutate(input)
  return normalizePaymentOrderSettings(result)
}
