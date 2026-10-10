import { z } from "zod"

export const repaymentScheduleStatusSchema = z.enum([
  "due",
  "overdue",
  "paid",
  "partially_paid",
  "pending",
  "waived",
])

export const repaymentStatusSchema = z.enum(["pending", "posted", "reversed"])

const scheduleSortFieldSchema = z.enum([
  "dueAt",
  "installmentNumber",
  "memberName",
  "status",
])

const historySortFieldSchema = z.enum([
  "amount",
  "memberName",
  "paidAt",
  "status",
])

const collectionStageSchema = z.enum([
  "active",
  "escalated",
  "promise_tracking",
  "resolved",
])

const collectionResolutionStatusSchema = z.enum(["open", "resolved"])

const dateSchema = z.coerce.date()

export const listRepaymentScheduleSchema = z
  .object({
    assignedToUserId: z.string().uuid().optional(),
    collectionsOnly: z.boolean().optional(),
    cursor: z.string().max(2_048).nullable().optional(),
    fromDate: dateSchema.optional(),
    memberId: z.string().uuid().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().trim().max(200).nullable().optional(),
    resolutionStatus: collectionResolutionStatusSchema.optional(),
    sort: z
      .tuple([scheduleSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    stage: collectionStageSchema.optional(),
    status: repaymentScheduleStatusSchema.optional(),
    toDate: dateSchema.optional(),
  })
  .optional()

export const listRepaymentHistorySchema = z
  .object({
    cursor: z.string().max(2_048).nullable().optional(),
    fromDate: dateSchema.optional(),
    memberId: z.string().uuid().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().trim().max(200).nullable().optional(),
    sort: z
      .tuple([historySortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: repaymentStatusSchema.optional(),
    toDate: dateSchema.optional(),
  })
  .optional()

export const getRepaymentScheduleItemSchema = z.object({
  repaymentScheduleItemId: z.string().uuid(),
})

export const getRepaymentSchema = z.object({
  repaymentId: z.string().uuid(),
})

export const repaymentSummarySchema = listRepaymentScheduleSchema
