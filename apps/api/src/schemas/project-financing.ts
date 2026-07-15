import { z } from "zod"

const projectFinancingRequestStatusSchema = z.enum([
  "active",
  "approved",
  "cancelled",
  "completed",
  "rejected",
  "submitted",
  "under_review",
])

const projectFinancingRequestSortFieldSchema = z.enum([
  "approvedAmount",
  "businessName",
  "disbursedAt",
  "estimatedMonthlyPayback",
  "memberName",
  "requestedAmount",
  "requestedAt",
  "status",
])

export const listProjectFinancingRequestsSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    memberId: z.string().uuid().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([projectFinancingRequestSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: projectFinancingRequestStatusSchema.optional(),
  })
  .optional()
