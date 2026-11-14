import { z } from "zod"
import {
  findProjectFinancingRequest,
  listProjectFinancingRequestPage,
  redactProjectFinancingRequestForMember,
} from "@halaalvest/db"
import { listProjectFinancingRequestsSchema } from "../schemas/project-financing"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"
import { getRequestChargeOptions, getScopedMemberId } from "../lib/member-scope"

export const projectFinancingRouter = createTRPCRouter({
  chargeOptions: tenantProcedure
    .input(z.object({ trigger: z.enum(["approval", "submission"]) }))
    .query(({ ctx, input }) =>
      getRequestChargeOptions(ctx, {
        trigger: input.trigger,
        workflow: "project_financing_request",
      })
    ),

  get: tenantProcedure
    .input(z.object({ projectFinancingRequestId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const scopedMemberId = await getScopedMemberId(ctx)
      const request = await findProjectFinancingRequest({
        memberId: scopedMemberId,
        projectFinancingRequestId: input.projectFinancingRequestId,
        tenantId: ctx.tenant.current.id,
      })

      return scopedMemberId && request
        ? redactProjectFinancingRequestForMember(request)
        : request
    }),

  list: tenantProcedure
    .input(listProjectFinancingRequestsSchema)
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize ?? 50
      const scopedMemberId = await getScopedMemberId(ctx)
      const result = await listProjectFinancingRequestPage({
        cursor: input?.cursor ?? undefined,
        memberId: scopedMemberId ?? input?.memberId,
        pageSize,
        search: input?.q || undefined,
        sort: input?.sort ?? null,
        status: input?.status,
        tenantId: ctx.tenant.current.id,
      })
      return {
        ...result,
        data: scopedMemberId
          ? result.data.map(redactProjectFinancingRequestForMember)
          : result.data,
      }
    }),
})
