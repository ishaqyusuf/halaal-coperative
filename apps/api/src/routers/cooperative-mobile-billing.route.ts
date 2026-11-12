import {
  getCooperativeMobileInvoice,
  listCooperativeMobileInvoices,
  listCooperativeMobileReceivables,
  recordCooperativeMobileRemittance,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

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

export const cooperativeMobileBillingRouter = createTRPCRouter({
  listInvoices: invoiceReader.query(({ ctx }) =>
    listCooperativeMobileInvoices(ctx.tenant.current.id)
  ),
  invoiceDetail: invoiceReader
    .input(z.object({ invoiceId: z.uuid() }))
    .query(({ ctx, input }) =>
      getCooperativeMobileInvoice({
        tenantId: ctx.tenant.current.id,
        invoiceId: input.invoiceId,
      })
    ),
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
