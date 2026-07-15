import { z } from "zod"

const businessStatusSchema = z.enum(["planned", "active", "completed", "archived"])

const profitEntryStatusSchema = z.enum([
  "draft",
  "pending",
  "reviewed",
  "completed",
  "approved",
  "archived",
])

const profitEntrySourceTypeSchema = z.enum(["manual", "backfill", "import"])

const businessSortFieldSchema = z.enum([
  "name",
  "startDate",
  "capitalAmount",
  "profitAmount",
  "status",
])

const dateFromFilterSchema = z
  .string()
  .optional()
  .transform((value) => (value ? new Date(`${value}T00:00:00.000Z`) : undefined))

const dateToFilterSchema = z
  .string()
  .optional()
  .transform((value) => (value ? new Date(`${value}T23:59:59.999Z`) : undefined))

export const listBusinessesSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    dividendPeriodId: z.string().uuid().optional(),
    hasProfitEntries: z.boolean().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    profitStatus: profitEntryStatusSchema.optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([businessSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    sourceType: profitEntrySourceTypeSchema.optional(),
    startFrom: dateFromFilterSchema,
    startTo: dateToFilterSchema,
    status: businessStatusSchema.optional(),
  })
  .optional()
