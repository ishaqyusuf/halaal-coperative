import {
  countAuditLogs,
  getActivityReportEvent,
  getReportsSummary,
  listActivityReportEvents,
} from "@halaalvest/db"
import { z } from "zod"

import { createTRPCRouter, minRoleProcedure } from "../lib.trpc"
import { getAuditEventSchema, listAuditEventsSchema } from "../schemas/reports"

function parseDateInput(value: string | undefined, endOfDay = false) {
  const normalized = value?.trim()

  if (!normalized) {
    return undefined
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? new Date(`${normalized}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`)
    : new Date(normalized)

  return Number.isNaN(date.getTime()) ? undefined : date
}

export const reportsRouter = createTRPCRouter({
  auditEvents: minRoleProcedure("tenant_admin")
    .input(listAuditEventsSchema)
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize ?? 30
      const filters = {
        action: input?.action || undefined,
        area: input?.area ?? undefined,
        cursor: input?.cursor ?? undefined,
        fromDate: input?.from,
        limit: pageSize + 1,
        search: input?.q || undefined,
        sort: input?.sort ?? null,
        toDate: input?.to,
      }
      // The total is counted once, for the first page only.
      const [events, total] = await Promise.all([
        listActivityReportEvents(ctx.tenant.current.id, filters),
        filters.cursor
          ? Promise.resolve(null)
          : countAuditLogs(ctx.tenant.current.id, filters),
      ])
      const data = events.slice(0, pageSize)

      return {
        data,
        meta: {
          cursor: events.length > pageSize ? data.at(-1)?.id : undefined,
          total,
        },
      }
    }),

  auditEvent: minRoleProcedure("tenant_admin")
    .input(getAuditEventSchema)
    .query(({ ctx, input }) =>
      getActivityReportEvent(ctx.tenant.current.id, input.id)
    ),

  summary: minRoleProcedure("tenant_admin")
    .input(
      z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .optional()
    )
    .query(({ ctx, input }) => {
      return getReportsSummary({
        fromDate: parseDateInput(input?.from),
        tenantId: ctx.tenant.current.id,
        toDate: parseDateInput(input?.to, true),
      })
    }),
})
