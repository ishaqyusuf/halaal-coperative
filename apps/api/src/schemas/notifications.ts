import { z } from "zod"

const notificationDeliverySortFieldSchema = z.enum([
  "createdAt",
  "notificationType",
  "recipient",
  "status",
  "subject",
])

export const notificationDeliveryStatusSchema = z.enum([
  "queued",
  "sent",
  "failed",
])

export const listNotificationDeliveriesSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    q: z.string().nullable().optional(),
    /** Accepted for older clients; the list is always newest first. */
    sort: z
      .tuple([notificationDeliverySortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
    status: notificationDeliveryStatusSchema.nullable().optional(),
    type: z.string().nullable().optional(),
  })
  .optional()

export const setStaffEmailSettingSchema = z.object({
  enabled: z.boolean(),
  notificationType: z.string().min(1),
  role: z.string().min(1),
})
