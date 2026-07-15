import { z } from "zod"
import {
  getMemberPaymentReceipt,
  getMemberByUserId,
  listMemberPaymentReceiptPage,
} from "@halaalvest/db"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

const paymentReceiptSortFieldSchema = z.enum([
  "memberName",
  "paidAt",
  "paymentReference",
  "status",
  "submittedAt",
  "totalAmount",
])

const paymentReceiptStatusSchema = z.enum([
  "approved",
  "correction_requested",
  "rejected",
  "submitted",
  "under_review",
])

const listPaymentReceiptsSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    memberId: z.string().uuid().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([paymentReceiptSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: paymentReceiptStatusSchema.optional(),
    submittedFrom: z
      .string()
      .optional()
      .transform((value) =>
        value ? new Date(`${value}T00:00:00.000Z`) : undefined
      ),
    submittedTo: z
      .string()
      .optional()
      .transform((value) =>
        value ? new Date(`${value}T23:59:59.999Z`) : undefined
      ),
  })
  .optional()

export const paymentReceiptsRouter = createTRPCRouter({
  get: tenantProcedure
    .input(z.object({ receiptId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      let memberId: string | undefined

      if (ctx.auth.activeMembership.role === "member") {
        const member = await getMemberByUserId({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })

        memberId = member?.id ?? "__missing_member_profile__"
      }

      return getMemberPaymentReceipt(ctx.tenant.current.id, input.receiptId, {
        memberId,
      })
    }),
  list: tenantProcedure
    .input(listPaymentReceiptsSchema)
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize ?? 50
      let memberId = input?.memberId

      if (ctx.auth.activeMembership.role === "member") {
        const member = await getMemberByUserId({
          tenantId: ctx.tenant.current.id,
          userId: ctx.auth.session.user.id,
        })

        memberId = member?.id ?? "__missing_member_profile__"
      }

      const result = await listMemberPaymentReceiptPage(
        ctx.tenant.current.id,
        {
          cursor: input?.cursor ?? undefined,
          memberId,
          pageSize: pageSize + 1,
          search: input?.q || undefined,
          sort: input?.sort ?? null,
          status: input?.status,
          submittedFrom: input?.submittedFrom,
          submittedTo: input?.submittedTo,
        }
      )
      const data = result.items.slice(0, pageSize)

      return {
        data,
        meta: {
          cursor: result.items.length > pageSize ? data.at(-1)?.id : undefined,
          total: result.total,
        },
      }
    }),
})
