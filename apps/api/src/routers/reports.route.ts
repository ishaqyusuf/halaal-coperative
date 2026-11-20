import {
  countAuditLogs,
  getActivityReportEvent,
  getReportsSummary,
  type ListAuditLogsInput,
  listActivityReportEvents,
  listActivityTimeline,
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

async function listAuditPage<Event extends { id: string }>(
  tenantId: string,
  input: z.output<typeof listAuditEventsSchema>,
  list: (tenantId: string, filters: ListAuditLogsInput) => Promise<Event[]>
) {
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
    list(tenantId, filters),
    filters.cursor ? Promise.resolve(null) : countAuditLogs(tenantId, filters),
  ])
  const data = events.slice(0, pageSize)

  return {
    data,
    meta: {
      cursor: events.length > pageSize ? data.at(-1)?.id : undefined,
      total,
    },
  }
}

const auditListProcedure =
  minRoleProcedure("tenant_admin").input(listAuditEventsSchema)

export const reportsRouter = createTRPCRouter({
  auditEvents: auditListProcedure.query(({ ctx, input }) =>
    listAuditPage(ctx.tenant.current.id, input, listActivityReportEvents)
  ),

  auditTimeline: auditListProcedure.query(({ ctx, input }) =>
    listAuditPage(ctx.tenant.current.id, input, listActivityTimeline)
  ),

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
      const tenantId = ctx.tenant.current.id
      return getReportsSummary(
        {
          fromDate: parseDateInput(input?.from),
          tenantId,
          toDate: parseDateInput(input?.to, true),
        },
        undefined,
        {
          operationProfile: ctx.lookups?.getTenantOperationProfile?.(tenantId),
        }
      )
    }),
})
