import { z } from "zod"

export const businessStatusSchema = z.enum([
  "planned",
  "active",
  "completed",
  "archived",
])

export const listBusinessesSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().trim().max(120).nullable().optional(),
    status: businessStatusSchema.nullable().optional(),
  })
  .optional()

export const businessIdSchema = z.object({ businessId: z.string().uuid() })

export const profitSeasonIdSchema = z.object({ seasonId: z.string().uuid() })

export const listProfitSeasonSharesSchema = z.object({
  cursor: z.string().nullable().optional(),
  q: z.string().trim().max(120).nullable().optional(),
  seasonId: z.string().uuid(),
})
