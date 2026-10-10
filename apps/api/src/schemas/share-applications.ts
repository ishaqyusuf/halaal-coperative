import { z } from "zod"

const shareApplicationStatusSchema = z.enum([
  "approved",
  "cancelled",
  "pending",
  "rejected",
])

const shareApplicationSortFieldSchema = z.enum([
  "createdAt",
  "memberName",
  "requestedUnits",
  "reviewedAt",
  "shareValueSnapshot",
  "status",
])

export const listShareApplicationsSchema = z
  .object({
    cursor: z.string().min(1).nullable().optional(),
    memberId: z.string().uuid().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().trim().max(200).nullable().optional(),
    sort: z
      .tuple([shareApplicationSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: shareApplicationStatusSchema.optional(),
  })
  .optional()
