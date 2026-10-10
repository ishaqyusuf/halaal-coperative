import { SUBSCRIPTION_PLAN_CODES } from "@halaalvest/domain/subscriptions"
import { z } from "zod"

export const subscriptionPlanCodeSchema = z.enum(SUBSCRIPTION_PLAN_CODES)

export const subscriptionCheckoutStatusSchema = z.object({
  intentId: z.string().uuid(),
})

export const requestSubscriptionPlanChangeSchema = z.object({
  idempotencyKey: z.string().trim().min(16).max(160),
  requestedPlanCode: subscriptionPlanCodeSchema,
})

export type RequestSubscriptionPlanChangeInput = z.infer<
  typeof requestSubscriptionPlanChangeSchema
>
