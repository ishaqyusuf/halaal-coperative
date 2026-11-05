import { z } from "zod"

export const monthlyRecordSortFieldSchema = z.enum([
  "allChargesAmount",
  "contributionAmount",
  "currentBalance",
  "finalIncomeAmount",
  "loanRepaymentAmount",
  "loanStatus",
  "memberName",
  "shareChargeAmount",
  "status",
  "totalPaidAmount",
  "totalPayableAmount",
])

export const monthlyRecordMemberStatusSchema = z.enum([
  "pending",
  "applied",
  "cancelled",
])

export const listMonthlyRecordRowsSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    monthlyRecordId: z.string().uuid().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().trim().max(120).nullable().optional(),
    sort: z
      .tuple([monthlyRecordSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: monthlyRecordMemberStatusSchema.nullable().optional(),
  })
  .optional()
