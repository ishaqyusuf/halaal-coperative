import { z } from "zod"

const procurementRequestStatusSchema = z.enum([
  "active",
  "approved",
  "cancelled",
  "completed",
  "purchased",
  "rejected",
  "submitted",
  "under_review",
])

const procurementRequestSortFieldSchema = z.enum([
  "approvedCost",
  "estimatedMonthlyRepayment",
  "itemName",
  "memberName",
  "outstandingAmount",
  "requestedAt",
  "requestedCost",
  "status",
  "vendorName",
])

export const listProcurementRequestsSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    memberId: z.string().uuid().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([procurementRequestSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: procurementRequestStatusSchema.optional(),
  })
  .optional()
