import { z } from "zod"
import {
  findProjectFinancingRequest,
  getMemberByUserId,
  listProjectFinancingRequestPage,
} from "@halaalvest/db"
import { listProjectFinancingRequestsSchema } from "../schemas/project-financing"
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

export const projectFinancingRouter = createTRPCRouter({
  get: tenantProcedure
    .input(z.object({ projectFinancingRequestId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const scopedMemberId = await getScopedMemberId(ctx)

      return findProjectFinancingRequest({
        memberId: scopedMemberId,
        projectFinancingRequestId: input.projectFinancingRequestId,
        tenantId: ctx.tenant.current.id,
      })
    }),

  list: tenantProcedure
    .input(listProjectFinancingRequestsSchema)
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize ?? 50
      const scopedMemberId = await getScopedMemberId(ctx)
      const result = await listProjectFinancingRequestPage({
        cursor: input?.cursor ?? undefined,
        memberId: scopedMemberId ?? input?.memberId,
        pageSize: pageSize + 1,
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
