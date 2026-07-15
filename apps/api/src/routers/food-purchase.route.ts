import { z } from "zod"
import {
  findFoodPurchaseApplication,
  getMemberByUserId,
  listFoodPurchaseApplicationPage,
} from "@halaalvest/db"
import { listFoodPurchaseApplicationsSchema } from "../schemas/food-purchase"
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

export const foodPurchaseRouter = createTRPCRouter({
  get: tenantProcedure
    .input(z.object({ foodPurchaseApplicationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const scopedMemberId = await getScopedMemberId(ctx)

      return findFoodPurchaseApplication({
        applicationId: input.foodPurchaseApplicationId,
        memberId: scopedMemberId,
        tenantId: ctx.tenant.current.id,
      })
    }),

  list: tenantProcedure
    .input(listFoodPurchaseApplicationsSchema)
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize ?? 50
      const scopedMemberId = await getScopedMemberId(ctx)
      const result = await listFoodPurchaseApplicationPage({
        cursor: input?.cursor ?? undefined,
        cycleId: input?.cycleId,
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
