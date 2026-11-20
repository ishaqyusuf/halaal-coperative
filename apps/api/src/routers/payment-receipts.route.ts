import { z } from "zod"
import { TRPCError } from "@trpc/server"
import {
  createMemberPaymentReceiptPageCursor,
  getMemberPaymentReceipt,
  listMemberPaymentReceiptPage,
  listPaymentReceiptMemberOptions,
} from "@halaalvest/db"
import { getScopedMemberId } from "../lib/member-scope"
import {
  createTRPCRouter,
  permissionProcedure,
  tenantProcedure,
} from "../lib.trpc"

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
  // What a receipt for one member can be allocated to. The receipt sheet asks
  // for it when staff pick a member, instead of the page loading every
  // member's plans, loans and requests.
  memberOptions: permissionProcedure("view_contribution_operations")
    .input(z.object({ memberId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      listPaymentReceiptMemberOptions({
        memberId: input.memberId,
        tenantId: ctx.tenant.current.id,
      })
    ),
  ownOptions: tenantProcedure.input(z.void()).query(async ({ ctx }) => {
    const memberId = await getScopedMemberId(ctx)

    if (!memberId || memberId === "__missing_member_profile__") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "A linked member profile is required to load receipt options.",
      })
    }

    return listPaymentReceiptMemberOptions({
      memberId,
      tenantId: ctx.tenant.current.id,
    })
  }),
  get: tenantProcedure
    .input(z.object({ receiptId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const memberId = await getScopedMemberId(ctx)
      if (memberId === "__missing_member_profile__") return null

      return getMemberPaymentReceipt(ctx.tenant.current.id, input.receiptId, {
        memberId,
      })
    }),
  list: tenantProcedure
    .input(listPaymentReceiptsSchema)
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize ?? 50
      const scopedMemberId = await getScopedMemberId(ctx)
      if (scopedMemberId === "__missing_member_profile__") {
        return { data: [], meta: { cursor: undefined, total: 0 } }
      }

      const result = await listMemberPaymentReceiptPage(ctx.tenant.current.id, {
        cursor: input?.cursor ?? undefined,
        memberId: scopedMemberId ?? input?.memberId,
        pageSize: pageSize + 1,
        search: input?.q || undefined,
        sort: input?.sort ?? null,
        status: input?.status,
        submittedFrom: input?.submittedFrom,
        submittedTo: input?.submittedTo,
      })
      const data = result.items.slice(0, pageSize)

      return {
        data,
        meta: {
          cursor:
            result.items.length > pageSize && data.at(-1)
              ? createMemberPaymentReceiptPageCursor(data.at(-1)!, input?.sort)
              : undefined,
          total: result.total,
        },
      }
    }),
})
