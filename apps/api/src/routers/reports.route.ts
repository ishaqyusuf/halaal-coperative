import { getReportsSummary } from "@halaalvest/db"
import { z } from "zod"

import { createTRPCRouter, minRoleProcedure } from "../lib.trpc"

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
  summary: minRoleProcedure("tenant_admin")
    .input(
      z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
        })
        .optional(),
    )
    .query(({ ctx, input }) => {
      return getReportsSummary({
        fromDate: parseDateInput(input?.from),
        tenantId: ctx.tenant.current.id,
        toDate: parseDateInput(input?.to, true),
      })
    }),
})
