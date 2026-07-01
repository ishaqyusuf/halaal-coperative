import { z } from "zod"

const memberStatusSchema = z.enum([
  "pending",
  "active",
  "inactive",
  "suspended",
  "exited",
])

const memberTypeSchema = z.enum(["civil_servant", "individual", "business"])

const kycStatusSchema = z.enum([
  "not_started",
  "pending",
  "verified",
  "rejected",
])

const memberSortFieldSchema = z.enum([
  "fullName",
  "memberNumber",
  "memberType",
  "status",
  "kycStatus",
  "joinedAt",
])

const dateFilterSchema = z
  .string()
  .optional()
  .transform((value) => (value ? new Date(`${value}T00:00:00.000Z`) : undefined))

const dateToFilterSchema = z
  .string()
  .optional()
  .transform((value) => (value ? new Date(`${value}T23:59:59.999Z`) : undefined))

export const listMembersSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    joinedFrom: dateFilterSchema,
    joinedTo: dateToFilterSchema,
    kycStatus: kycStatusSchema.optional(),
    memberType: memberTypeSchema.optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([memberSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: memberStatusSchema.optional(),
  })
  .optional()

