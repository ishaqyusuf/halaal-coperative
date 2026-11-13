import {
  findCooperativeMobilePaystackCheckout,
  getCooperativeMobileInvoice,
  listCooperativeMobileInvoices,
  listCooperativeMobileReceivables,
  recordCooperativeMobileRemittance,
} from "@halaalvest/db"
import { roleCan } from "@halaalvest/auth/roles"
import { buildTenantDashboardUrl } from "@halaalvest/utils"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import {
  canUseCooperativePaystack,
  cooperativePaystackConfig,
  cooperativePaystackReference,
  reconcileCooperativePaystackCheckout,
  startCooperativePaystackCheckout,
} from "../billing/cooperative-paystack"
import {
  createTRPCRouter,
  permissionProcedure,
  platformOwnerProcedure,
} from "../lib.trpc"

function requireWebBilling(ctx: { request: { mobileAuthenticated: boolean } }) {
  if (ctx.request.mobileAuthenticated) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cooperative billing is available on the web dashboard.",
    })
  }
}

const invoiceReader = permissionProcedure("view_reports").use(
  ({ ctx, next }) => {
    requireWebBilling(ctx)
    return next()
  }
)
const billingOperator = platformOwnerProcedure.use(({ ctx, next }) => {
  requireWebBilling(ctx)
  return next()
})

const invoicePayer = permissionProcedure("manage_finance_settings").use(
  ({ ctx, next }) => {
    requireWebBilling(ctx)
    if (ctx.auth.session.qaAuthorizationId)
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Use a regular finance session.",
      })
    return next({ ctx })
  }
)

const invoiceInput = z.object({ invoiceId: z.uuid() })

export const cooperativeMobileBillingRouter = createTRPCRouter({
  listInvoices: invoiceReader.query(({ ctx }) =>
    listCooperativeMobileInvoices(ctx.tenant.current.id)
  ),
  invoiceDetail: invoiceReader
    .input(invoiceInput)
    .query(async ({ ctx, input }) => {
      const tenantId = ctx.tenant.current.id
      const invoice = await getCooperativeMobileInvoice({ tenantId, ...input })
      const config = cooperativePaystackConfig()
      const canPay =
        config &&
        canUseCooperativePaystack(config, tenantId) &&
        !ctx.auth.session.qaAuthorizationId &&
        roleCan(ctx.auth.activeMembership.role, "manage_finance_settings")
      const checkout =
        canPay && invoice.status === "issued"
          ? await findCooperativeMobilePaystackCheckout({
              ...input,
              tenantId,
              mode: config.mode,
            })
          : null
      return {
        ...invoice,
        paystackCheckoutEnabled: Boolean(
          canPay &&
          config.checkoutEnabled &&
          invoice.status === "issued" &&
          invoice.currencyCode === "NGN"
        ),
        paystackPaymentPending: Boolean(checkout && !checkout.verifiedAt),
      }
    }),
  startPaystackCheckout: invoicePayer
    .input(invoiceInput)
    .mutation(({ ctx, input }) => {
      const tenant = ctx.tenant.current
      const callback = new URL(
        buildTenantDashboardUrl(tenant.slug, {
          currentOrigin: process.env.DASHBOARD_APP_URL,
          pathname: "/mobile-access",
          tenantHostname:
            ctx.tenant.domain?.verificationStatus === "verified"
              ? ctx.tenant.domain.hostname
              : null,
        })
      )
      callback.searchParams.set("paystackInvoice", input.invoiceId)
      return startCooperativePaystackCheckout({
        invoiceId: input.invoiceId,
        tenantId: tenant.id,
        email: ctx.auth.session.user.email,
        callback,
      })
    }),
  verifyPaystackCheckout: invoicePayer
    .input(
      invoiceInput.extend({
        reference: cooperativePaystackReference.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const config = cooperativePaystackConfig()
      if (!config) return { status: "unavailable" as const }
      const status = await reconcileCooperativePaystackCheckout(config, {
        ...input,
        tenantId: ctx.tenant.current.id,
      })
      return { status }
    }),
  listReceivables: billingOperator.query(({ ctx }) =>
    listCooperativeMobileReceivables(ctx.auth.session.user.id)
  ),
  recordRemittance: billingOperator
    .input(
      z.object({
        invoiceId: z.uuid(),
        reference: z.string().trim().min(1).max(120),
        paidAt: z.iso.date(),
      })
    )
    .mutation(({ ctx, input }) =>
      recordCooperativeMobileRemittance({
        ...input,
        actorUserId: ctx.auth.session.user.id,
      })
    ),
})
