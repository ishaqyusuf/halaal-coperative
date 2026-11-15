import { z } from "zod"
import {
  findMemberShareApplication,
  getMemberByUserId,
  listMemberShareApplicationPage,
} from "@halaalvest/db"
import { isRoleAtLeast } from "@halaalvest/auth/roles"
import { TRPCError } from "@trpc/server"
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

// /shares is for finance roles and members (lib/navigation/registry.ts).
// Members only ever see their own requests (getScopedMemberId); staff below
// finance officer (operations officers) see none.
const shareApplicationsProcedure = tenantProcedure.use(({ ctx, next }) => {
  const role = ctx.auth.activeMembership.role
  if (role !== "member" && !isRoleAtLeast(role, "finance_officer")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Finance access is required to see share requests.",
    })
  }

  return next({ ctx })
})

export const shareApplicationsRouter = createTRPCRouter({
  get: shareApplicationsProcedure
    .input(z.object({ memberShareApplicationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const scopedMemberId = await getScopedMemberId(ctx)

      return findMemberShareApplication({
        memberId: scopedMemberId,
        memberShareApplicationId: input.memberShareApplicationId,
        tenantId: ctx.tenant.current.id,
      })
    }),

  list: shareApplicationsProcedure
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
