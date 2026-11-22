import {
  createPrismaClient,
  DEFAULT_PAYMENT_ALLOCATION_ORDER,
  getTenantPaymentAllocationSettingsSnapshot,
  updateTenantPaymentAllocationSettings,
} from "@halaalvest/db"
import { TRPCError } from "@trpc/server"
import { z } from "zod"

import { createTRPCRouter, permissionProcedure } from "../lib.trpc"

const orderKey = z.enum(
  DEFAULT_PAYMENT_ALLOCATION_ORDER as [
    (typeof DEFAULT_PAYMENT_ALLOCATION_ORDER)[number],
    ...(typeof DEFAULT_PAYMENT_ALLOCATION_ORDER)[number][],
  ]
)

export const paymentOrderUpdateInput = z
  .object({
    leftoverDestination: z.literal("special_savings"),
    mode: z.enum(["automatic", "member_choice"]),
    order: z.array(orderKey).length(DEFAULT_PAYMENT_ALLOCATION_ORDER.length),
  })
  .refine(
    (input) => new Set(input.order).size === input.order.length,
    "Each item appears once in the payment order."
  )

function prisma() {
  const client = createPrismaClient()
  if (!client)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not configured",
    })
  return client
}

/**
 * T30 screen 5: the cooperative's payment order (how unsplit member payments
 * are applied at approval). Admins with `manage_operation_profile` only.
 */
export const mobileAdminPaymentOrderProcedures = {
  paymentOrder: createTRPCRouter({
    get: permissionProcedure("manage_operation_profile").query(({ ctx }) =>
      getTenantPaymentAllocationSettingsSnapshot(ctx.tenant.current.id, prisma())
    ),
    update: permissionProcedure("manage_operation_profile")
      .input(paymentOrderUpdateInput)
      .mutation(({ ctx, input }) =>
        updateTenantPaymentAllocationSettings(
          {
            ...input,
            actorUserId: ctx.auth.session.user.id,
            tenantId: ctx.tenant.current.id,
          },
          prisma()
        )
      ),
  }),
}
