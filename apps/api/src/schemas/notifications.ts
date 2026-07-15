import { z } from "zod"

const notificationDeliverySortFieldSchema = z.enum([
  "createdAt",
  "notificationType",
  "recipient",
  "status",
  "subject",
])

export const listNotificationDeliveriesSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().nullable().optional(),
    sort: z
      .tuple([notificationDeliverySortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: z.enum(["queued", "sent", "failed"]).nullable().optional(),
    type: z.string().nullable().optional(),
  })
  .optional()
