import { z } from "zod"

const membershipApprovalStatusSchema = z.enum([
  "pending_email_verification",
  "pending_approval",
  "approved",
  "rejected",
  "cancelled",
])

const membershipApprovalSortFieldSchema = z.enum([
  "emailVerifiedAt",
  "fullName",
  "memberNumber",
  "phoneNumber",
  "status",
  "submittedAt",
])

export const listMembershipApprovalsSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([membershipApprovalSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: membershipApprovalStatusSchema.nullable().optional(),
  })
  .optional()
