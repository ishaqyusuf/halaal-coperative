import { z } from "zod"
import {
  getProcurementRequest,
  listProcurementRequestPage,
} from "@halaalvest/db"
import { listProcurementRequestsSchema } from "../schemas/procurement"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"
import { getRequestChargeOptions, getScopedMemberId } from "../lib/member-scope"

export const procurementRouter = createTRPCRouter({
  chargeOptions: tenantProcedure
    .input(z.object({ trigger: z.enum(["approval", "submission"]) }))
    .query(({ ctx, input }) =>
      getRequestChargeOptions(ctx, {
        trigger: input.trigger,
        workflow: "procurement_request",
      })
    ),

  get: tenantProcedure
    .input(z.object({ procurementRequestId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const scopedMemberId = await getScopedMemberId(ctx)

      return getProcurementRequest({
        memberId: scopedMemberId,
        procurementRequestId: input.procurementRequestId,
        tenantId: ctx.tenant.current.id,
      })
    }),

  list: tenantProcedure
    .input(listProcurementRequestsSchema)
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize ?? 50
      const scopedMemberId = await getScopedMemberId(ctx)
      const result = await listProcurementRequestPage({
        cursor: input?.cursor ?? undefined,
        memberId: scopedMemberId ?? input?.memberId,
        pageSize,
        search: input?.q || undefined,
        sort: input?.sort ?? null,
        status: input?.status,
        tenantId: ctx.tenant.current.id,
      })
      return result
    }),
})
