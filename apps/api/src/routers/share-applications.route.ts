import { z } from "zod"
import {
  findMemberShareApplication,
  getMemberByUserId,
  listMemberShareApplicationPage,
} from "@halaalvest/db"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"
import { listShareApplicationsSchema } from "../schemas/share-applications"

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

export const shareApplicationsRouter = createTRPCRouter({
  get: tenantProcedure
    .input(z.object({ memberShareApplicationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const scopedMemberId = await getScopedMemberId(ctx)

      return findMemberShareApplication({
        memberId: scopedMemberId,
        memberShareApplicationId: input.memberShareApplicationId,
        tenantId: ctx.tenant.current.id,
      })
    }),

  list: tenantProcedure
    .input(listShareApplicationsSchema)
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize ?? 50
      const scopedMemberId = await getScopedMemberId(ctx)
      return listMemberShareApplicationPage({
        cursor: input?.cursor ?? undefined,
        memberId: scopedMemberId ?? input?.memberId,
        pageSize,
        search: input?.q || undefined,
        sort: input?.sort ?? null,
        status: input?.status,
        tenantId: ctx.tenant.current.id,
      })
    }),
})
