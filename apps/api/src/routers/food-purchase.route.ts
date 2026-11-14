import { z } from "zod"
import type { FoodPurchaseApplicationRow } from "@halaalvest/db"
import {
  findFoodPurchaseApplication,
  listFoodPurchaseApplicationPage,
} from "@halaalvest/db"
import { listFoodPurchaseApplicationsSchema } from "../schemas/food-purchase"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"
import { getRequestChargeOptions, getScopedMemberId } from "../lib/member-scope"

function toFoodPurchaseApplicationDto(
  application: FoodPurchaseApplicationRow,
  isMember: boolean
): FoodPurchaseApplicationRow
function toFoodPurchaseApplicationDto(
  application: null,
  isMember: boolean
): null
function toFoodPurchaseApplicationDto(
  application: FoodPurchaseApplicationRow | null,
  isMember: boolean
): FoodPurchaseApplicationRow | null
function toFoodPurchaseApplicationDto(
  application: FoodPurchaseApplicationRow | null,
  isMember: boolean
): FoodPurchaseApplicationRow | null {
  if (!application || !isMember) return application

  return {
    ...application,
    member: {
      fullName: application.member.fullName,
      id: application.member.id,
      memberNumber: application.member.memberNumber,
    },
    reviewedByUser: application.reviewedByUser
      ? {
          fullName: application.reviewedByUser.fullName,
          id: application.reviewedByUser.id,
        }
      : null,
    submittedByUser: {
      fullName: application.submittedByUser.fullName,
      id: application.submittedByUser.id,
    },
  }
}

export const foodPurchaseRouter = createTRPCRouter({
  chargeOptions: tenantProcedure
    .input(z.object({ trigger: z.enum(["approval", "submission"]) }))
    .query(({ ctx, input }) =>
      getRequestChargeOptions(ctx, {
        trigger: input.trigger,
        workflow: "food_purchase_application",
      })
    ),

  get: tenantProcedure
    .input(z.object({ foodPurchaseApplicationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const scopedMemberId = await getScopedMemberId(ctx)
      const application = await findFoodPurchaseApplication({
        applicationId: input.foodPurchaseApplicationId,
        memberId: scopedMemberId,
        tenantId: ctx.tenant.current.id,
      })

      return toFoodPurchaseApplicationDto(
        application,
        ctx.auth.activeMembership.role === "member"
      )
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
        pageSize,
        search: input?.q || undefined,
        sort: input?.sort ?? null,
        status: input?.status,
        tenantId: ctx.tenant.current.id,
      })
      return {
        data: result.data.map((application: FoodPurchaseApplicationRow) =>
          toFoodPurchaseApplicationDto(
            application,
            ctx.auth.activeMembership.role === "member"
          )
        ),
        meta: {
          cursor: result.meta.cursor,
          total: result.meta.total,
        },
      }
    }),
})
