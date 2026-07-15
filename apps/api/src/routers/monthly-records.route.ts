import {
  getMonthlyRecordDetail,
  type MonthlyRecordMemberRow,
} from "@halaalvest/db"
import type { z } from "zod"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"
import { listMonthlyRecordRowsSchema } from "../schemas/monthly-records"

type MonthlyRecordRowsInput = z.infer<typeof listMonthlyRecordRowsSchema>
type MonthlyRecordSortField = NonNullable<
  NonNullable<MonthlyRecordRowsInput>["sort"]
>[0]

function getSortValue(
  row: MonthlyRecordMemberRow,
  field: MonthlyRecordSortField,
) {
  return row[field]
}

function sortRows(
  rows: MonthlyRecordMemberRow[],
  sort?: [MonthlyRecordSortField, "asc" | "desc"] | null,
) {
  if (!sort) return rows

  const [field, direction] = sort
  const factor = direction === "asc" ? 1 : -1

  return [...rows].sort((left, right) => {
    const leftValue = getSortValue(left, field)
    const rightValue = getSortValue(right, field)

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * factor
    }

    return String(leftValue).localeCompare(String(rightValue)) * factor
  })
}

export const monthlyRecordsRouter = createTRPCRouter({
  rows: tenantProcedure
    .input(listMonthlyRecordRowsSchema)
    .query(async ({ ctx, input }) => {
      const pageSize = input?.pageSize ?? 50

      if (!input?.monthlyRecordId) {
        return {
          data: [],
          meta: {
            cursor: undefined,
            total: 0,
          },
        }
      }

      const record = await getMonthlyRecordDetail(
        ctx.tenant.current.id,
        input.monthlyRecordId,
      )
      const rows = sortRows(record?.rows ?? [], input.sort ?? null)
      const startIndex = input.cursor
        ? rows.findIndex((row) => row.id === input.cursor) + 1
        : 0
      const safeStartIndex = startIndex > 0 ? startIndex : 0
      const pageRows = rows.slice(safeStartIndex, safeStartIndex + pageSize + 1)
      const data = pageRows.slice(0, pageSize)

      return {
        data,
        meta: {
          cursor: pageRows.length > pageSize ? data.at(-1)?.id : undefined,
          total: rows.length,
        },
      }
    }),
})
