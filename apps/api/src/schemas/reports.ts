import { z } from "zod"

const auditSortFieldSchema = z.enum([
  "action",
  "actor",
  "entityType",
  "occurredAt",
])

const dateFromFilterSchema = z
  .string()
  .optional()
  .transform((value) =>
    value ? new Date(`${value}T00:00:00.000Z`) : undefined
  )

const dateToFilterSchema = z
  .string()
  .optional()
  .transform((value) =>
    value ? new Date(`${value}T23:59:59.999Z`) : undefined
  )

export const listAuditEventsSchema = z
  .object({
    action: z.string().nullable().optional(),
    cursor: z.string().nullable().optional(),
    from: dateFromFilterSchema,
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([auditSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    to: dateToFilterSchema,
  })
  .optional()
