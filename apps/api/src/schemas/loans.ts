import { z } from "zod"

export const loanRequestStatusSchema = z.enum([
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "cancelled",
  "expired",
])

export const loanStatusSchema = z.enum([
  "approved",
  "disbursed",
  "active",
  "completed",
  "defaulted",
  "written_off",
])

export const loanRequestSortFieldSchema = z.enum([
  "memberName",
  "requestedAt",
  "status",
])

export const loanPortfolioSortFieldSchema = z.enum([
  "estimatedMonthlyServicing",
  "loanProductName",
  "memberName",
  "status",
])

const loanListBaseSchema = {
  cursor: z.string().max(2_048).nullable().optional(),
  memberId: z.string().uuid().optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  q: z.string().trim().max(200).nullable().optional(),
}

export const listLoanRequestsSchema = z
  .object({
    ...loanListBaseSchema,
    sort: z
      .tuple([loanRequestSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: loanRequestStatusSchema.nullable().optional(),
  })
  .optional()

export const listLoanPortfolioSchema = z
  .object({
    ...loanListBaseSchema,
    sort: z
      .tuple([loanPortfolioSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: loanStatusSchema.nullable().optional(),
  })
  .optional()

export const getLoanRequestSchema = z.object({
  loanRequestId: z.string().uuid(),
})

export const getLoanSchema = z.object({
  loanId: z.string().uuid(),
})
