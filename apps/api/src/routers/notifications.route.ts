import {
  countAuditLogs,
  listAuditLogs,
  listNotificationPreferences,
} from "@halaalvest/db"
import { createHalaalVestNotificationFromType } from "@halaalvest/notifications"

import { createTRPCRouter, tenantProcedure } from "../lib.trpc"
import { listNotificationDeliveriesSchema } from "../schemas/notifications"

function getMetadataString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }

  const value = (metadata as Record<string, unknown>)[key]

  return typeof value === "string" ? value : null
}

function getDeliveryStatus(action: string) {
  if (action === "notification.email_sent") return "sent"
  if (action === "notification.email_failed") return "failed"
  if (action === "notification.email_queued") return "queued"

  return "unknown"
}

function getDeliverySort(
  sort?: [
    "createdAt" | "notificationType" | "recipient" | "status" | "subject",
    "asc" | "desc",
  ] | null,
): ["action" | "occurredAt", "asc" | "desc"] {
  if (!sort) return ["occurredAt", "desc"]

  const [field, direction] = sort

  if (field === "createdAt") return ["occurredAt", direction]
  if (field === "status") return ["action", direction]

  return ["occurredAt", "desc"]
}

export const notificationsRouter = createTRPCRouter({
  deliveryHistory: tenantProcedure
    .input(listNotificationDeliveriesSchema)
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize ?? 50
      const action =
        input?.status === "queued" ||
        input?.status === "sent" ||
        input?.status === "failed"
          ? `notification.email_${input.status}`
          : "notification.email"
      const baseFilters = {
        action,
        cursor: input?.cursor ?? undefined,
        limit: pageSize + 1,
        search: input?.q || undefined,
        sort: getDeliverySort(input?.sort),
      }
      const [logs, total, preferences] = await Promise.all([
        listAuditLogs(ctx.tenant.current.id, baseFilters),
        countAuditLogs(ctx.tenant.current.id, {
          ...baseFilters,
          cursor: undefined,
        }),
        listNotificationPreferences(ctx.tenant.current.id),
      ])
      const filteredLogs = input?.type
        ? logs.filter(
            (entry) =>
              getMetadataString(entry.metadata, "notificationType") ===
              input.type,
          )
        : logs
      const data = filteredLogs.slice(0, pageSize).map((entry) => ({
        action: entry.action,
        deliveryStatus: getDeliveryStatus(entry.action),
        id: entry.id,
        notificationType:
          getMetadataString(entry.metadata, "notificationType") ??
          "notification.email",
        occurredAt: entry.occurredAt,
        recipient:
          getMetadataString(entry.metadata, "recipient") ??
          "Unknown recipient",
      }))

      return {
        data,
        meta: {
          cursor: filteredLogs.length > pageSize ? data.at(-1)?.id : undefined,
          preferenceCount: preferences.length,
          total,
        },
      }
    }),

  list: tenantProcedure.query(({ ctx }) => {
    return [
      createHalaalVestNotificationFromType("member.status_changed", {
        memberId: "sample-member",
        memberName: "Amina Yusuf",
        status: "active",
        tenantName: ctx.tenant.current.name,
      }),
      createHalaalVestNotificationFromType("loan.request_status_changed", {
        amount: 250000,
        loanRequestId: "sample-loan-request",
        memberName: "Amina Yusuf",
        status: "under_review",
        tenantName: ctx.tenant.current.name,
      }),
    ]
  }),
})
