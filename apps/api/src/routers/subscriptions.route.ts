import { z } from "zod"
import { AppError } from "@halaalvest/errors"
import { getStoreAccountBinding, isActiveQaStoreTenant } from "@halaalvest/db"
import { storeSchema } from "../billing/store-policy"
import { verifyAndApplyStorePurchase } from "../billing/store-purchase-application"
import { canRestoreStorePurchases } from "../billing/store-catalog-availability"
import { roleCan } from "@halaalvest/auth/roles"
import {
  createSubscriptionCheckoutIntent,
  getTenantSubscriptionSnapshot,
  getTenantSubscriptionCheckout,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"

import { createTRPCRouter, tenantProcedure } from "../lib.trpc"
import {
  requestSubscriptionPlanChangeSchema,
  subscriptionCheckoutStatusSchema,
} from "../schemas/subscriptions"
import {
  billingCheckoutHosts,
  presentSubscriptionCheckout,
} from "../billing/checkout-presentation"

const subscriptionAdminProcedure = tenantProcedure.use(({ ctx, next }) => {
  if (!roleCan(ctx.auth.activeMembership.role, "manage_subscription")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Subscription administration access is required for this action.",
    })
  }

  return next({ ctx })
})

export const subscriptionsRouter = createTRPCRouter({
  storeCatalog: subscriptionAdminProcedure
    .input(z.object({ store: storeSchema }))
    .query(async ({ ctx, input }) => {
      const environment = process.env.STORE_BILLING_ENVIRONMENT
      const sandboxTenantEligible =
        environment === "sandbox" &&
        (await isActiveQaStoreTenant(ctx.tenant.current.id))
      if (!canRestoreStorePurchases({ environment, sandboxTenantEligible }))
        return { products: [], accountBinding: null }
      // The former tenant-tier native catalog is superseded by personal app
      // access. Preserve binding for any historical receipt restoration only.
      const products: [] = []
      return {
        products,
        accountBinding: await getStoreAccountBinding(ctx.tenant.current.id),
      }
    }),
  verifyStorePurchase: subscriptionAdminProcedure
    .input(
      z.discriminatedUnion("store", [
        z.object({
          store: z.literal("apple"),
          transactionId: z.string().regex(/^[0-9]{1,80}$/),
        }),
        z.object({
          store: z.literal("google"),
          purchaseToken: z.string().min(1).max(8192),
        }),
      ])
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await verifyAndApplyStorePurchase(input, {
          tenantId: ctx.tenant.current.id,
          actorUserId: ctx.auth.session.user.id,
        })
      } catch (error) {
        if (error instanceof AppError) throw error
        throw new AppError({
          code: "PROVIDER_UNAVAILABLE",
          publicMessage:
            "The store purchase could not be verified. Your purchase remains recoverable; try Restore purchases again.",
        })
      }
    }),
  snapshot: subscriptionAdminProcedure.query(({ ctx }) =>
    getTenantSubscriptionSnapshot({ tenantId: ctx.tenant.current.id })
  ),

  checkoutStatus: subscriptionAdminProcedure
    .input(subscriptionCheckoutStatusSchema)
    .query(async ({ ctx, input }) => {
      const intent = await getTenantSubscriptionCheckout({
        intentId: input.intentId,
        tenantId: ctx.tenant.current.id,
      })
      return presentSubscriptionCheckout(intent, billingCheckoutHosts())
    }),

  requestPlanChange: subscriptionAdminProcedure
    .input(requestSubscriptionPlanChangeSchema)
    .mutation(async ({ ctx, input }) => {
      const intent = await createSubscriptionCheckoutIntent({
        idempotencyKey: input.idempotencyKey,
        requestedByUserId: ctx.auth.session.user.id,
        requestedPlanCode: input.requestedPlanCode,
        requestState: {
          channel: "mobile",
          providerConfigured: false,
        },
        tenantId: ctx.tenant.current.id,
      })

      return presentSubscriptionCheckout(intent, billingCheckoutHosts())
    }),
})
