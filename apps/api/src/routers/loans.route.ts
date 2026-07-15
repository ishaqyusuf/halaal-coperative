import { listLoanRequests, listLoans } from "@halaalvest/db"
import { z } from "zod"
import { createTRPCRouter, tenantProcedure } from "../lib.trpc"

const loanRequestSortFieldSchema = z.enum([
  "memberName",
  "requestedAt",
  "reviewStatus",
  "status",
])

const loanPortfolioSortFieldSchema = z.enum([
  "estimatedMonthlyServicing",
  "loanProductName",
  "memberName",
  "status",
])

const listLoanRequestsSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    memberId: z.string().uuid().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    sort: z
      .tuple([loanRequestSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
  })
  .optional()

const listLoanPortfolioSchema = z
  .object({
    cursor: z.string().nullable().optional(),
    memberId: z.string().uuid().optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
    sort: z
      .tuple([loanPortfolioSortFieldSchema, z.enum(["asc", "desc"])])
      .nullable()
      .optional(),
  })
  .optional()

function sortRows<TRow>(
  rows: TRow[],
  sort: [string, "asc" | "desc"] | null | undefined,
  getValue: (row: TRow, field: string) => string | number
) {
  if (!sort) return rows

  const [field, direction] = sort
  const factor = direction === "asc" ? 1 : -1

  return [...rows].sort((left, right) => {
    const leftValue = getValue(left, field)
    const rightValue = getValue(right, field)

    if (typeof leftValue === "number" && typeof rightValue === "number") {
      return (leftValue - rightValue) * factor
    }

    return String(leftValue).localeCompare(String(rightValue)) * factor
  })
}

function paginateRows<TRow extends { id: string }>(
  rows: TRow[],
  input?: { cursor?: string | null; pageSize?: number }
) {
  const pageSize = input?.pageSize ?? 50
  const startIndex = input?.cursor
    ? rows.findIndex((row) => row.id === input.cursor) + 1
    : 0
  const data = rows.slice(startIndex, startIndex + pageSize)
  const next = rows[startIndex + pageSize]

  return {
    data,
    meta: {
      cursor: next?.id,
      total: rows.length,
    },
  }
}

export const loansRouter = createTRPCRouter({
  portfolio: tenantProcedure
    .input(listLoanPortfolioSchema)
    .query(async ({ ctx, input }) => {
      const rows = (await listLoans(ctx.tenant.current.id)).filter((row) =>
        input?.memberId ? row.member.id === input.memberId : true
      )
      const sortedRows = sortRows(rows, input?.sort ?? null, (row, field) => {
        if (field === "estimatedMonthlyServicing") {
          return Number(row.estimatedMonthlyServicing)
        }
        if (field === "loanProductName") return row.loanProduct.name
        if (field === "memberName") return row.member.fullName
        return row.status
      })

      return paginateRows(sortedRows, input)
    }),

  requests: tenantProcedure
    .input(listLoanRequestsSchema)
    .query(async ({ ctx, input }) => {
      const rows = (await listLoanRequests(ctx.tenant.current.id)).filter((row) =>
        input?.memberId ? row.member.id === input.memberId : true
      )
      const sortedRows = sortRows(rows, input?.sort ?? null, (row, field) => {
        if (field === "memberName") return row.member.fullName
        if (field === "requestedAt") return row.requestedAt.getTime()
        if (field === "reviewStatus") {
          return row.guarantorApprovals.some(
            (approval) => approval.status === "pending"
          )
            ? "pending"
            : "complete"
        }
        return row.status
      })

      return paginateRows(sortedRows, input)
    }),
})
