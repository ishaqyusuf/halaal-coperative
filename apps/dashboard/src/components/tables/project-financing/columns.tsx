"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { formatCurrency } from "@halaalvest/utils"
import type {
  ProjectFinancingRequestRow,
  ProjectFinancingStructure,
} from "@halaalvest/db"
import type { ColumnDef } from "@tanstack/react-table"
import { memo } from "react"
import {
  OpenProjectFinancingDisbursementSheet,
  OpenProjectFinancingReviewSheet,
} from "@/components/open-project-financing-sheet"

export type ProjectFinancingRequest = ProjectFinancingRequestRow

type ProjectFinancingTableMeta = {
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

function formatStructure(value: ProjectFinancingStructure | null) {
  if (!value) return "Not set"

  return value.replace(/_/g, " ")
}

function statusClassName(status: ProjectFinancingRequest["status"]) {
  if (status === "approved" || status === "active" || status === "completed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "rejected" || status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  return "border-amber-200 bg-amber-50 text-amber-700"
}

const RequestCell = memo(
  ({ request }: { request: ProjectFinancingRequest }) => (
    <div>
      <p className="truncate font-medium text-foreground">
        {request.businessName}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {request.member.fullName} · {formatStructure(request.proposedStructure)}
      </p>
    </div>
  )
)

RequestCell.displayName = "RequestCell"

const StatusBadge = memo(
  ({ status }: { status: ProjectFinancingRequest["status"] }) => (
    <Badge className={statusClassName(status)} variant="outline">
      {status.replaceAll("_", " ")}
    </Badge>
  )
)

StatusBadge.displayName = "StatusBadge"

export const columns: ColumnDef<ProjectFinancingRequest>[] = [
  {
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${row.original.businessName}`}
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
    accessorKey: "requestedAmount",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {formatCurrency(row.original.requestedAmount)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.original.requestedPaybackMonths
            ? `${row.original.requestedPaybackMonths} months`
            : "No term"}
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
          {row.original.approvedAmount
            ? formatCurrency(row.original.approvedAmount)
            : "Not approved"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatStructure(row.original.approvedStructure)}
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Approved",
    id: "approved",
    maxSize: 240,
    meta: {
      className: "w-[190px] min-w-[150px]",
      headerLabel: "Approved",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 150,
    size: 190,
  },
  {
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {row.original.approvedMonthlyPayback
            ? formatCurrency(row.original.approvedMonthlyPayback)
            : row.original.estimatedMonthlyPayback
              ? formatCurrency(row.original.estimatedMonthlyPayback)
              : "Not set"}
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
    cell: ({ row }) =>
      row.original.disbursedAt ? formatDate(row.original.disbursedAt) : "No",
    enableResizing: true,
    header: "Disbursed",
    id: "disbursed",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Disbursed",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 120,
    size: 140,
  },
  {
    cell: ({ row, table }) => {
      const meta = table.options.meta as ProjectFinancingTableMeta
      const request = row.original

      if (!meta.canReview) {
        return <span className="text-xs text-muted-foreground">Read only</span>
      }

      if (["submitted", "under_review"].includes(request.status)) {
        return <OpenProjectFinancingReviewSheet requestId={request.id} />
      }

      if (request.status === "approved") {
        return <OpenProjectFinancingDisbursementSheet requestId={request.id} />
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
