import type { PrismaClient } from "../../generated/prisma/client"
import { AppError } from "@halaalvest/errors"
import { createPrismaClient } from "../prisma"

/** A checkout return is a read, never evidence that money was received. */
export async function getTenantSubscriptionCheckout(
  input: { tenantId: string; intentId: string },
  prismaOverride?: PrismaClient
) {
  const prisma = prismaOverride ?? createPrismaClient()
  if (!prisma) throw new Error("Database not configured")
  const intent = await prisma.subscriptionCheckoutIntent.findFirst({
    where: { id: input.intentId, tenantId: input.tenantId },
    select: {
      id: true,
      requestedPlanCode: true,
      status: true,
      checkoutUrl: true,
      expiresAt: true,
      requestState: true,
    },
  })
  if (!intent)
    throw new AppError({
      code: "NOT_FOUND",
      internalMessage: "Checkout not found in the signed tenant scope.",
      operation: "subscription.checkout_status",
      publicMessage: "This plan request could not be found.",
    })
  return intent
}
