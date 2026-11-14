"use client"

import { formatCurrency } from "@halaalvest/utils"
import type { FoodPurchaseApplicationRow } from "@halaalvest/db"
import type { ColumnDef } from "@tanstack/react-table"
import { memo } from "react"
import { RequestStatusBadge } from "@/components/requests/request-status-badge"
import {
  formatMonths,
  formatMonthYear,
} from "@/lib/requests/request-status-words"
import { formatDayMonthYear } from "@/utils/format"

export type FoodPurchaseApplication = FoodPurchaseApplicationRow

/** The amount that counts now: approved when approved, else what was asked. */
export function getFoodPurchaseAmount(application: FoodPurchaseApplication) {
  const approved = application.approvedAmount !== null

  return {
    amount: approved
      ? (application.approvedAmount ?? 0)
      : application.requestedAmount,
    months: approved
      ? (application.approvedPaybackMonths ??
        application.requestedPaybackMonths)
      : application.requestedPaybackMonths,
  }
}

export function getFoodPurchaseOutstandingAmount(
  application: FoodPurchaseApplication
) {
  if (application.approvedAmount === null) return null

  return Math.max((application.approvedAmount ?? 0) - application.paidAmount, 0)
}

export function FoodPurchaseStatusBadge({
  application,
}: {
  application: FoodPurchaseApplication
}) {
  return (
    <RequestStatusBadge
      approvedAmount={application.approvedAmount}
      kind="foodPurchase"
      paidAmount={application.paidAmount}
      status={application.status}
    />
  )
}

const ApplicationCell = memo(
  ({ application }: { application: FoodPurchaseApplication }) => (
    <div className="min-w-0">
      <p className="truncate font-medium text-foreground">
        {application.member.fullName}
      </p>
      <p className="mt-0.5 truncate text-sm text-muted-foreground">
        {formatMonthYear(application.cycle.periodMonth)}
      </p>
    </div>
  )
)

ApplicationCell.displayName = "ApplicationCell"

export const columns: ColumnDef<FoodPurchaseApplication>[] = [
  {
    cell: ({ row }) => <ApplicationCell application={row.original} />,
    enableResizing: true,
    header: "Member",
    id: "application",
    maxSize: 520,
    meta: {
      className:
        "w-[300px] min-w-[220px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Member",
      skeleton: { type: "avatar-text", width: "w-36" },
      sticky: true,
    },
    minSize: 220,
    size: 300,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => <FoodPurchaseStatusBadge application={row.original} />,
    enableResizing: true,
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
    accessorKey: "requestedAmount",
    cell: ({ row }) => {
      const { amount, months } = getFoodPurchaseAmount(row.original)

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
    accessorKey: "paidAmount",
    cell: ({ row }) => {
      const owed = getFoodPurchaseOutstandingAmount(row.original)

      return owed === null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className="font-medium tabular-nums">{formatCurrency(owed)}</span>
      )
    },
    enableResizing: true,
    header: "Still owed",
    id: "payment",
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
    accessorKey: "itemDescription",
    cell: ({ row }) => (
      <span className="truncate">{row.original.itemDescription ?? "—"}</span>
    ),
    enableResizing: true,
    header: "What food",
    id: "item",
    maxSize: 360,
    meta: {
      className: "w-[220px] min-w-[160px]",
      headerLabel: "What food",
      skeleton: { type: "text", width: "w-32" },
    },
    minSize: 160,
    size: 220,
  },
]
