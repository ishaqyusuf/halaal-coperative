import {
  choosePlatformBillFundingSource,
  findPlatformBillPaystackCheckout,
  getPlatformBill,
  getPlatformBillingOverview,
  issueQaPlatformBill,
  listPlatformBillFundingSources,
  listPlatformBillReceivables,
  listPlatformBills,
  recordPlatformBillRemittance,
  updatePlatformBillingSettings,
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

/**
 * Halaalvest's monthly bill to the cooperative (seat fee, website assistant
 * overage, mobile access). Web dashboard only. See
 * .brain/features/platform-billing.md.
 */

export function isProductionBillingRuntime(env: NodeJS.ProcessEnv = process.env) {
  return (
    env.VERCEL_ENV === "production" ||
    env.DEPLOYMENT_ENVIRONMENT === "production" ||
    env.HALAALVEST_ENV === "production" ||
    env.HALAALVEST_ENV_MODE === "production"
  )
}

function requireWebBilling(ctx: { request: { mobileAuthenticated: boolean } }) {
  if (ctx.request.mobileAuthenticated) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Cooperative billing is available on the web dashboard.",
    })
  }
}

const billReader = permissionProcedure("view_reports").use(({ ctx, next }) => {
  requireWebBilling(ctx)
  return next()
})
const settingsManager = permissionProcedure("manage_subscription").use(
  ({ ctx, next }) => {
    requireWebBilling(ctx)
    return next()
  }
)
/** Choosing the source of funds records intent only; QA sessions may do it. */
const fundingChooser = permissionProcedure("manage_finance_settings").use(
  ({ ctx, next }) => {
    requireWebBilling(ctx)
    return next()
  }
)
/** Moving real money needs a regular finance session. */
const billPayer = fundingChooser.use(({ ctx, next }) => {
  if (ctx.auth.session.qaAuthorizationId)
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Use a regular finance session.",
    })
  return next({ ctx })
})
const billingOperator = platformOwnerProcedure.use(({ ctx, next }) => {
  requireWebBilling(ctx)
  return next()
})
/** Outside production only; the query also requires a QA cooperative. */
const qaBillIssuer = settingsManager.use(({ next }) => {
  if (isProductionBillingRuntime())
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Issuing a bill on demand is only for QA cooperatives outside production.",
    })
  return next()
})

const billInput = z.object({ billId: z.uuid() })

export const platformBillingRouter = createTRPCRouter({
  overview: billReader.query(async ({ ctx }) => {
    const overview = await getPlatformBillingOverview({
      tenantId: ctx.tenant.current.id,
    })
    return {
      ...overview,
      qaBillAvailable:
        overview.qaTenant &&
        !isProductionBillingRuntime() &&
        roleCan(ctx.auth.activeMembership.role, "manage_subscription"),
    }
  }),
  listBills: billReader.query(({ ctx }) =>
    listPlatformBills(ctx.tenant.current.id)
  ),
  billDetail: billReader.input(billInput).query(async ({ ctx, input }) => {
    const tenantId = ctx.tenant.current.id
    const bill = await getPlatformBill({ tenantId, ...input })
    const config = cooperativePaystackConfig()
    const canPay =
      config &&
      canUseCooperativePaystack(config, tenantId) &&
      !ctx.auth.session.qaAuthorizationId &&
      roleCan(ctx.auth.activeMembership.role, "manage_finance_settings")
    const checkout =
      canPay && bill.status === "issued"
        ? await findPlatformBillPaystackCheckout({
            ...input,
            tenantId,
            mode: config.mode,
          })
        : null
    return {
      ...bill,
      canChooseFunding:
        bill.status === "issued" &&
        roleCan(ctx.auth.activeMembership.role, "manage_finance_settings"),
      paystackCheckoutEnabled: Boolean(
        canPay &&
          config.checkoutEnabled &&
          bill.status === "issued" &&
          bill.currencyCode === "NGN"
      ),
      paystackPaymentPending: Boolean(checkout && !checkout.verifiedAt),
    }
  }),
  fundingSources: fundingChooser.query(({ ctx }) =>
    listPlatformBillFundingSources(ctx.tenant.current.id)
  ),
  chooseFundingSource: fundingChooser
    .input(
      billInput.extend({
        sourceType: z.enum(["charge", "business"]),
        sourceId: z.uuid(),
      })
    )
    .mutation(({ ctx, input }) =>
      choosePlatformBillFundingSource({
        ...input,
        tenantId: ctx.tenant.current.id,
        actorUserId: ctx.auth.session.user.id,
      })
    ),
  updateSettings: settingsManager
    .input(
      z
        .object({
          seatFeePayer: z.enum(["cooperative", "members"]).optional(),
          assistantAutoBilling: z.boolean().optional(),
          assistantMonthlyCap: z.number().min(0).max(10_000_000).optional(),
        })
        .refine((value) => Object.keys(value).length > 0, "Nothing to change.")
    )
    .mutation(({ ctx, input }) =>
      updatePlatformBillingSettings({
        ...input,
        tenantId: ctx.tenant.current.id,
        actorUserId: ctx.auth.session.user.id,
      })
    ),
  issueQaBill: qaBillIssuer.mutation(({ ctx }) =>
    issueQaPlatformBill({
      tenantId: ctx.tenant.current.id,
      actorUserId: ctx.auth.session.user.id,
    })
  ),
  startPaystackCheckout: billPayer
    .input(billInput)
    .mutation(({ ctx, input }) => {
      const tenant = ctx.tenant.current
      const callback = new URL(
        buildTenantDashboardUrl(tenant.slug, {
          currentOrigin: process.env.DASHBOARD_APP_URL,
          pathname: "/billing",
          tenantHostname:
            ctx.tenant.domain?.verificationStatus === "verified"
              ? ctx.tenant.domain.hostname
              : null,
        })
      )
      callback.searchParams.set("billId", input.billId)
      callback.searchParams.set("paystackReturn", "true")
      return startCooperativePaystackCheckout({
        billId: input.billId,
        tenantId: tenant.id,
        email: ctx.auth.session.user.email,
        callback,
      })
    }),
  verifyPaystackCheckout: billPayer
    .input(
      billInput.extend({
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
  listReceivables: billingOperator.query(() =>
    listPlatformBillReceivables({ includeQa: !isProductionBillingRuntime() })
  ),
  recordRemittance: billingOperator
    .input(
      z.object({
        billId: z.uuid(),
        reference: z.string().trim().min(1).max(120),
        paidAt: z.iso.date(),
      })
    )
    .mutation(({ ctx, input }) =>
      recordPlatformBillRemittance({
        ...input,
        actorUserId: ctx.auth.session.user.id,
        includeQa: !isProductionBillingRuntime(),
      })
    ),
})
