import { z } from "zod"
import {
  findSupportCase,
  getMemberByUserId,
  listSupportCasePage,
} from "@halaalvest/db"
import { listSupportCasesSchema } from "../schemas/support"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

async function getScopedMemberId(ctx: {
  auth: {
    activeMembership: { role: string }
    session: { user: { id: string } }
  }
  tenant: { current: { id: string } }
}) {
  if (ctx.auth.activeMembership.role !== "member") {
    return undefined
  }

  const member = await getMemberByUserId({
    tenantId: ctx.tenant.current.id,
    userId: ctx.auth.session.user.id,
  })

  return member?.id ?? "__missing_member_profile__"
}

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
      const pageSize = input?.pageSize ?? 50
      const scopedMemberId = await getScopedMemberId(ctx)
      const result = await listSupportCasePage({
        assignedToUserId: input?.assignedToUserId,
        category: input?.category,
        cursor: input?.cursor ?? undefined,
        memberId: scopedMemberId ?? input?.memberId,
        pageSize: pageSize + 1,
        priority: input?.priority,
        search: input?.q || undefined,
        sort: input?.sort ?? null,
        status: input?.status,
        tenantId: ctx.tenant.current.id,
      })
      const data = result.data.slice(0, pageSize)

      return {
        data,
        meta: {
          cursor: result.data.length > pageSize ? data.at(-1)?.id : undefined,
          total: result.meta.total,
        },
      }
    }),
})
