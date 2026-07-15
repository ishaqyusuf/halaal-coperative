import { z } from "zod"

const supportCaseStatusSchema = z.enum([
  "open",
  "in_progress",
  "waiting_on_member",
  "resolved",
  "closed",
])

const supportCasePrioritySchema = z.enum(["low", "normal", "high", "urgent"])

const supportCaseCategorySchema = z.enum([
  "payment_issue",
  "account_update",
  "shares",
  "financing",
  "procurement",
  "feature_request",
  "technical",
  "other",
])

const supportCaseSortFieldSchema = z.enum([
  "assignedToUser",
  "category",
  "createdAt",
  "latestReply",
  "linkedRecord",
  "priority",
  "status",
  "subject",
  "updatedAt",
])

export const listSupportCasesSchema = z
  .object({
    assignedToUserId: z.string().uuid().optional(),
    category: supportCaseCategorySchema.optional(),
    cursor: z.string().nullable().optional(),
    memberId: z.string().uuid().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    priority: supportCasePrioritySchema.optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([supportCaseSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: supportCaseStatusSchema.optional(),
  })
  .optional()
