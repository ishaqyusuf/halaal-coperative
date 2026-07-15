"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { formatCurrency } from "@halaalvest/utils"
import type { ProcurementRequestRow } from "@halaalvest/db"
import type { ColumnDef } from "@tanstack/react-table"
import { memo } from "react"
import {
  OpenProcurementPurchaseSheet,
  OpenProcurementRequestReviewSheet,
} from "@/components/open-procurement-request-sheet"

export type ProcurementRequest = ProcurementRequestRow

type ProcurementTableMeta = {
  canReview: boolean
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function displayEnum(value: string) {
  return value.replaceAll("_", " ")
}

function statusClassName(status: ProcurementRequest["status"]) {
  if (status === "approved" || status === "purchased" || status === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "rejected" || status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  return "border-amber-200 bg-amber-50 text-amber-700"
}

function getScheduleCounts(request: ProcurementRequest) {
  return request.repaymentScheduleItems.reduce(
    (summary, schedule) => {
      const outstanding = Math.max(0, schedule.amount - schedule.paidAmount)

      if (schedule.status === "due") {
        summary.due += 1
      }

      if (schedule.status === "overdue") {
        summary.overdue += 1
      }

      summary.outstanding += outstanding

      return summary
    },
    { due: 0, outstanding: 0, overdue: 0 }
  )
}

const RequestCell = memo(({ request }: { request: ProcurementRequest }) => (
  <div>
    <p className="truncate font-medium text-foreground">{request.itemName}</p>
    <p className="mt-1 truncate text-xs text-muted-foreground">
      {request.member.fullName} · {request.member.memberNumber}
    </p>
  </div>
))

RequestCell.displayName = "RequestCell"

const StatusBadge = memo(
  ({ status }: { status: ProcurementRequest["status"] }) => (
    <Badge className={statusClassName(status)} variant="outline">
      {displayEnum(status)}
    </Badge>
  )
)

StatusBadge.displayName = "StatusBadge"

export const columns: ColumnDef<ProcurementRequest>[] = [
  {
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${row.original.itemName}`}
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked === true)}
      />
    ),
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    id: "select",
    maxSize: 50,
    meta: {
      className:
        "w-[50px] min-w-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20 justify-center",
      skeleton: { type: "checkbox" },
      sticky: true,
    },
    minSize: 50,
    size: 50,
  },
  {
    accessorKey: "itemName",
    cell: ({ row }) => <RequestCell request={row.original} />,
    enableResizing: true,
    header: "Request",
    id: "request",
    maxSize: 520,
    meta: {
      className:
        "w-[320px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Request",
      skeleton: { type: "avatar-text", width: "w-36" },
      sticky: true,
    },
    minSize: 240,
    size: 320,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    enableResizing: true,
    header: "Status",
    id: "status",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Status",
      skeleton: { type: "badge" },
    },
    minSize: 120,
    size: 140,
  },
  {
    accessorKey: "requestedCost",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {formatCurrency(row.original.requestedCost)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.original.requestedRepaymentMonths} months
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Requested",
    id: "requested",
    maxSize: 220,
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "Requested",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 150,
    size: 170,
  },
  {
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {row.original.approvedCost
            ? formatCurrency(row.original.approvedCost)
            : "Not approved"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.original.approvedRepaymentMonths
            ? `${row.original.approvedRepaymentMonths} months`
            : "Awaiting review"}
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Approved",
    id: "approved",
    maxSize: 220,
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "Approved",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 150,
    size: 170,
  },
  {
    accessorKey: "estimatedMonthlyRepayment",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {formatCurrency(
            row.original.approvedMonthlyRepayment ??
              row.original.estimatedMonthlyRepayment
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">monthly</p>
      </div>
    ),
    enableResizing: true,
    header: "Monthly",
    id: "monthly",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Monthly",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 120,
    size: 140,
  },
  {
    cell: ({ row }) => {
      const counts = getScheduleCounts(row.original)

      return (
        <div>
          <p className="font-medium">
            {formatCurrency(counts.outstanding)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {counts.due} due · {counts.overdue} overdue
          </p>
        </div>
      )
    },
    enableResizing: true,
    header: "Schedule",
    id: "schedule",
    maxSize: 220,
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "Schedule",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 150,
    size: 170,
  },
  {
    accessorKey: "requestedAt",
    cell: ({ row }) => (
      <div>
        <p>{formatDate(row.original.requestedAt)}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.createdByUser.fullName}
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Requested at",
    id: "requestedAt",
    maxSize: 220,
    meta: {
      className: "w-[170px] min-w-[140px]",
      headerLabel: "Requested at",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 140,
    size: 170,
  },
  {
    accessorKey: "vendorName",
    cell: ({ row }) => row.original.vendorName ?? "No vendor",
    enableResizing: true,
    header: "Vendor",
    id: "vendor",
    maxSize: 220,
    meta: {
      className: "w-[170px] min-w-[140px]",
      headerLabel: "Vendor",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 140,
    size: 170,
  },
  {
    cell: ({ row, table }) => {
      const meta = table.options.meta as ProcurementTableMeta
      const request = row.original

      if (!meta.canReview) {
        return <span className="text-xs text-muted-foreground">Read only</span>
      }

      if (["submitted", "under_review"].includes(request.status)) {
        return <OpenProcurementRequestReviewSheet requestId={request.id} />
      }

      if (request.status === "approved") {
        return <OpenProcurementPurchaseSheet requestId={request.id} />
      }

      return <span className="text-xs text-muted-foreground">No action</span>
    },
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    header: "Actions",
    id: "actions",
    maxSize: 140,
    meta: {
      className:
        "text-right sticky right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-30 justify-center !border-l !border-border",
      headerLabel: "Actions",
      skeleton: { type: "icon" },
      sticky: true,
    },
    minSize: 120,
    size: 120,
  },
]
