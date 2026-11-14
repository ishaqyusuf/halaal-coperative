import { z } from "zod"

const chargeLibrarySortFieldSchema = z.enum([
  "amount",
  "currentEffectiveFrom",
  "isActive",
  "kind",
  "name",
])

export const listChargeLibrarySchema = z
  .object({
    frequency: z.string().nullable().optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([chargeLibrarySortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: z.string().nullable().optional(),
    valueType: z.string().nullable().optional(),
  })
  .optional()

export const listChargeActivitySchema = z
  .object({
    cursor: z.string().uuid().nullable().optional(),
    pageSize: z.coerce.number().int().min(1).max(50).optional(),
    q: z.string().trim().max(100).nullable().optional(),
  })
  .optional()
