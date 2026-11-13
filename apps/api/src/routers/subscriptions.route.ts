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
  if (ctx.request.mobileAuthenticated) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Subscription administration is available on the web dashboard.",
    })
  }
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
