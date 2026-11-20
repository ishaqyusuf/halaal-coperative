import { z } from "zod"
import { findSupportCase, listSupportCaseRowsPage } from "@halaalvest/db"
import { getScopedMemberId } from "../lib/member-scope"
import { listSupportCasesSchema } from "../schemas/support"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

export const supportRouter = createTRPCRouter({
  get: tenantProcedure
    .input(z.object({ supportCaseId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const scopedMemberId = await getScopedMemberId(ctx)

      return findSupportCase({
        memberId: scopedMemberId,
        supportCaseId: input.supportCaseId,
        tenantId: ctx.tenant.current.id,
      })
    }),

  list: tenantProcedure
    .input(listSupportCasesSchema)
    .query(async ({ ctx, input }) => {
      const scopedMemberId = await getScopedMemberId(ctx)

      return listSupportCaseRowsPage({
        assignedToUserId: scopedMemberId ? undefined : input?.assignedToUserId,
        category: scopedMemberId ? undefined : input?.category,
        cursor: input?.cursor ?? undefined,
        includeTotal: input?.includeTotal,
        memberId: scopedMemberId ?? input?.memberId,
        pageSize: input?.pageSize ?? 50,
        priority: input?.priority,
        search: input?.q || undefined,
        sort: input?.sort ?? null,
        status: input?.status,
        statusGroup: input?.statusGroup,
        tenantId: ctx.tenant.current.id,
      })
    }),
})
