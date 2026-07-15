"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { formatCurrency } from "@halaalvest/utils"
import type { FoodPurchaseApplicationRow } from "@halaalvest/db"
import type { ColumnDef } from "@tanstack/react-table"
import { memo } from "react"
import { OpenFoodPurchaseApplicationReviewSheet } from "@/components/open-food-purchase-sheet"

export type FoodPurchaseApplication = FoodPurchaseApplicationRow

type FoodPurchaseTableMeta = {
  canReviewApplications: boolean
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatMonth(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    month: "short",
    year: "numeric",
  })
}

function displayEnum(value: string) {
  return value.replaceAll("_", " ")
}

function statusClassName(status: string) {
  if (status.includes("approved") || status === "closed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status.includes("rejected") || status === "cancelled") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  return "border-amber-200 bg-amber-50 text-amber-700"
}

function outstandingAmount(application: FoodPurchaseApplication) {
  const approvedAmount = application.approvedAmount ?? 0

  return Math.max(approvedAmount - application.paidAmount, 0)
}

const ApplicationCell = memo(
  ({ application }: { application: FoodPurchaseApplication }) => (
    <div>
      <p className="truncate font-medium text-foreground">
        {application.member.fullName}
      </p>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {formatMonth(application.cycle.periodMonth)} ·{" "}
        {application.itemDescription ?? "Foodstuff Purchase request"}
      </p>
    </div>
  )
)

ApplicationCell.displayName = "ApplicationCell"

const StatusBadge = memo(({ status }: { status: string }) => (
  <Badge className={statusClassName(status)} variant="outline">
    {displayEnum(status)}
  </Badge>
))

StatusBadge.displayName = "StatusBadge"

export const columns: ColumnDef<FoodPurchaseApplication>[] = [
  {
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${row.original.member.fullName}`}
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
          {row.original.requestedPaybackMonths} month
          {row.original.requestedPaybackMonths === 1 ? "" : "s"}
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
          {row.original.approvedPaybackMonths
            ? `${row.original.approvedPaybackMonths} month${
                row.original.approvedPaybackMonths === 1 ? "" : "s"
              }`
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
    cell: ({ row }) => (
      <div>
        <p className="font-medium">
          {formatCurrency(row.original.paidAmount)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatCurrency(outstandingAmount(row.original))} outstanding
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Payment",
    id: "payment",
    maxSize: 220,
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "Payment",
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
          {formatMonth(row.original.cycle.periodMonth)}
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
    accessorKey: "itemDescription",
    cell: ({ row }) => row.original.itemDescription ?? "No item note",
    enableResizing: true,
    header: "Item",
    id: "item",
    maxSize: 280,
    meta: {
      className: "w-[220px] min-w-[160px]",
      headerLabel: "Item",
      skeleton: { type: "text", width: "w-28" },
    },
    minSize: 160,
    size: 220,
  },
  {
    cell: ({ row, table }) => {
      const meta = table.options.meta as FoodPurchaseTableMeta
      const application = row.original

      if (
        meta.canReviewApplications &&
        application.cycle.status === "open" &&
        ["submitted", "under_review"].includes(application.status)
      ) {
        return (
          <OpenFoodPurchaseApplicationReviewSheet
            applicationId={application.id}
          />
        )
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
