"use client"

import type { MemberShareApplicationRow } from "@halaalvest/db"
import { Badge } from "@halaalvest/ui/components/badge"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { formatCurrency } from "@halaalvest/utils"
import type { ColumnDef } from "@tanstack/react-table"
import { memo } from "react"
import { OpenShareApplicationReviewSheet } from "@/components/open-share-application-sheet"

export type ShareApplication = MemberShareApplicationRow

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function statusLabel(status: ShareApplication["status"]) {
  switch (status) {
    case "approved":
      return "Approved"
    case "rejected":
      return "Rejected"
    case "cancelled":
      return "Cancelled"
    default:
      return "Pending"
  }
}

function statusClassName(status: ShareApplication["status"]) {
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "rejected" || status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  return "border-amber-200 bg-amber-50 text-amber-700"
}

const ApplicationCell = memo(
  ({ application }: { application: ShareApplication }) => (
    <div>
      <p className="truncate font-medium text-foreground">
        {application.memberName}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {application.memberNumber} · {application.requestedUnits} requested
        units
      </p>
    </div>
  )
)

ApplicationCell.displayName = "ApplicationCell"

const StatusBadge = memo(
  ({ status }: { status: ShareApplication["status"] }) => (
    <Badge className={statusClassName(status)} variant="outline">
      {statusLabel(status)}
    </Badge>
  )
)

StatusBadge.displayName = "StatusBadge"

export const columns: ColumnDef<ShareApplication>[] = [
  {
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${row.original.memberName}`}
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
    cell: ({ row }) => <ApplicationCell application={row.original} />,
    enableResizing: true,
    header: "Application",
    id: "application",
    maxSize: 520,
    meta: {
      className:
        "w-[320px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Application",
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
      className: "w-[150px] min-w-[120px]",
      headerLabel: "Status",
      skeleton: { type: "badge" },
    },
    minSize: 120,
    size: 150,
  },
  {
    accessorKey: "requestedUnits",
    cell: ({ row }) => `${row.original.requestedUnits} units`,
    enableResizing: true,
    header: "Units",
    id: "units",
    maxSize: 150,
    meta: {
      className: "w-[120px] min-w-[100px]",
      headerLabel: "Units",
      skeleton: { type: "text", width: "w-16" },
    },
    minSize: 100,
    size: 120,
  },
  {
    accessorKey: "shareValueSnapshot",
    cell: ({ row }) => (
      <span className="font-medium">
        {formatCurrency(row.original.shareValueSnapshot)}
      </span>
    ),
    enableResizing: true,
    header: "Value",
    id: "value",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Value",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 120,
    size: 140,
  },
  {
    accessorKey: "createdAt",
    cell: ({ row }) => formatDate(row.original.createdAt),
    enableResizing: true,
    header: "Requested",
    id: "requestedAt",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Requested",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 120,
    size: 140,
  },
  {
    accessorKey: "notes",
    cell: ({ row }) => row.original.notes ?? "No note",
    enableResizing: true,
    header: "Notes",
    id: "notes",
    maxSize: 260,
    meta: {
      className: "w-[220px] min-w-[160px]",
      headerLabel: "Notes",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 160,
    size: 220,
  },
  {
    accessorKey: "reviewNotes",
    cell: ({ row }) => row.original.reviewNotes ?? "No review note",
    enableResizing: true,
    header: "Review note",
    id: "reviewNotes",
    maxSize: 260,
    meta: {
      className: "w-[220px] min-w-[160px]",
      headerLabel: "Review note",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 160,
    size: 220,
  },
  {
    cell: ({ row }) =>
      row.original.status === "pending" ? (
        <div className="flex justify-end">
          <OpenShareApplicationReviewSheet applicationId={row.original.id} />
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Reviewed</span>
      ),
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    header: "Actions",
    id: "actions",
    maxSize: 180,
    meta: {
      className:
        "text-right sticky right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-30 justify-center !border-l !border-border",
      headerLabel: "Actions",
      skeleton: { type: "icon" },
      sticky: true,
    },
    minSize: 160,
    size: 160,
  },
]
