import { z } from "zod"

const foodPurchaseApplicationStatusSchema = z.enum([
  "approved",
  "cancelled",
  "rejected",
  "submitted",
  "under_review",
])

export const foodPurchaseApplicationReviewStatusSchema = z.enum([
  "approved",
  "rejected",
  "under_review",
])

export const foodPurchaseAccountingReviewDecisionSchema = z.enum([
  "approved",
  "rejected",
])

const foodPurchaseApplicationSortFieldSchema = z.enum([
  "approvedAmount",
  "itemDescription",
  "memberName",
  "paidAmount",
  "requestedAmount",
  "requestedAt",
  "status",
])

export const listFoodPurchaseApplicationsSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    cycleId: z.string().uuid().optional(),
    memberId: z.string().uuid().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([foodPurchaseApplicationSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: foodPurchaseApplicationStatusSchema.optional(),
  })
  .optional()
