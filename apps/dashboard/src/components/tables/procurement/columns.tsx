"use client"

import { formatCurrency } from "@halaalvest/utils"
import type { ProcurementRequestRow } from "@halaalvest/db"
import type { ColumnDef } from "@tanstack/react-table"
import { memo } from "react"
import { RequestStatusBadge } from "@/components/requests/request-status-badge"
import {
  formatMonths,
  monthlyAmount,
} from "@/lib/requests/request-status-words"
import { formatDayMonthYear } from "@/utils/format"

export type ProcurementRequest = ProcurementRequestRow

/** The amount that counts now: approved when approved, else what was asked. */
export function getProcurementAmount(request: ProcurementRequest) {
  const approved = request.approvedCost !== null

  return {
    amount: approved ? (request.approvedCost ?? 0) : request.requestedCost,
    months: approved
      ? (request.approvedRepaymentMonths ?? request.requestedRepaymentMonths)
      : request.requestedRepaymentMonths,
  }
}

export function getProcurementLatePayments(request: ProcurementRequest) {
  return request.repaymentScheduleItems.filter(
    (item) => item.status === "overdue"
  ).length
}

const RequestCell = memo(({ request }: { request: ProcurementRequest }) => (
  <div className="min-w-0">
    <p className="truncate font-medium text-foreground">{request.itemName}</p>
    <p className="mt-0.5 truncate text-sm text-muted-foreground">
      {request.member.fullName}
    </p>
  </div>
))

RequestCell.displayName = "RequestCell"

export const columns: ColumnDef<ProcurementRequest>[] = [
  {
    accessorKey: "itemName",
    cell: ({ row }) => <RequestCell request={row.original} />,
    enableResizing: true,
    header: "Item",
    id: "request",
    maxSize: 520,
    meta: {
      className:
        "w-[300px] min-w-[220px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Item",
      skeleton: { type: "avatar-text", width: "w-36" },
      sticky: true,
    },
    minSize: 220,
    size: 300,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => (
      <RequestStatusBadge kind="procurement" status={row.original.status} />
    ),
    enableResizing: true,
    enableSorting: false,
    header: "Status",
    id: "status",
    maxSize: 200,
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Status",
      skeleton: { type: "badge" },
    },
    minSize: 130,
    size: 150,
  },
  {
    accessorKey: "requestedCost",
    cell: ({ row }) => {
      const { amount, months } = getProcurementAmount(row.original)

      return (
        <div>
          <p className="font-medium tabular-nums">{formatCurrency(amount)}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatMonths(months)}
          </p>
        </div>
      )
    },
    enableResizing: true,
    header: "Amount",
    id: "requested",
    maxSize: 240,
    meta: {
      className: "w-[180px] min-w-[150px]",
      headerLabel: "Amount",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 150,
    size: 180,
  },
  {
    accessorKey: "estimatedMonthlyRepayment",
    cell: ({ row }) => {
      const { amount, months } = getProcurementAmount(row.original)
      const monthly =
        row.original.approvedMonthlyRepayment ?? monthlyAmount(amount, months)

      return (
        <span className="tabular-nums">
          {monthly ? formatCurrency(monthly) : "—"}
        </span>
      )
    },
    enableResizing: true,
    header: "Each month",
    id: "monthly",
    maxSize: 200,
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Each month",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 130,
    size: 150,
  },
  {
    cell: ({ row }) => {
      const late = getProcurementLatePayments(row.original)

      if (!row.original.repaymentScheduleItems.length) {
        return <span className="text-muted-foreground">—</span>
      }

      return (
        <div>
          <p className="font-medium tabular-nums">
            {formatCurrency(row.original.outstandingAmount)}
          </p>
          {late ? (
            <p className="mt-0.5 text-sm font-medium text-amber-800 dark:text-amber-400">
              {late === 1 ? "1 late payment" : `${late} late payments`}
            </p>
          ) : null}
        </div>
      )
    },
    enableResizing: true,
    enableSorting: false,
    header: "Still owed",
    id: "schedule",
    maxSize: 240,
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "Still owed",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 150,
    size: 170,
  },
  {
    accessorKey: "requestedAt",
    cell: ({ row }) => formatDayMonthYear(row.original.requestedAt),
    enableResizing: true,
    header: "Asked on",
    id: "requestedAt",
    maxSize: 220,
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Asked on",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 130,
    size: 150,
  },
  {
    accessorKey: "vendorName",
    cell: ({ row }) => row.original.vendorName ?? "—",
    enableResizing: true,
    header: "Shop or seller",
    id: "vendor",
    maxSize: 260,
    meta: {
      className: "w-[180px] min-w-[140px]",
      headerLabel: "Shop or seller",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 140,
    size: 180,
  },
]
