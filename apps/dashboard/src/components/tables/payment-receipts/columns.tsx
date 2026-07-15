"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { formatCurrency } from "@halaalvest/utils"
import type { MemberPaymentReceiptRow } from "@halaalvest/db"
import type { ColumnDef } from "@tanstack/react-table"
import { memo } from "react"
import {
  OpenMemberPaymentReceiptSupportSheet,
  OpenPaymentReceiptReviewSheet,
  OpenPaymentReceiptSupportSheet,
} from "@/components/open-payment-receipt-sheet"

export type PaymentReceipt = MemberPaymentReceiptRow

type PaymentReceiptTableMeta = {
  mode: "member" | "staff"
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function labelFromValue(value: string) {
  return value.replace(/_/g, " ")
}

function statusClassName(status: PaymentReceipt["status"]) {
  if (status === "approved") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "rejected") {
    return "border-rose-200 bg-rose-50 text-rose-700"
  }

  if (status === "correction_requested") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border-sky-200 bg-sky-50 text-sky-700"
}

const ReceiptCell = memo(({ receipt }: { receipt: PaymentReceipt }) => (
  <div>
    <p className="truncate font-medium text-foreground">
      {receipt.member.fullName}
    </p>
    <p className="mt-1 truncate text-xs text-muted-foreground">
      {receipt.member.memberNumber} · {formatCurrency(receipt.totalAmount)}
    </p>
  </div>
))

ReceiptCell.displayName = "ReceiptCell"

const StatusBadge = memo(({ status }: { status: PaymentReceipt["status"] }) => (
  <Badge className={statusClassName(status)} variant="outline">
    {labelFromValue(status)}
  </Badge>
))

StatusBadge.displayName = "StatusBadge"

export const columns: ColumnDef<PaymentReceipt>[] = [
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
    cell: ({ row }) => <ReceiptCell receipt={row.original} />,
    enableResizing: true,
    header: "Receipt",
    id: "receipt",
    maxSize: 520,
    meta: {
      className:
        "w-[320px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Receipt",
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
    accessorKey: "totalAmount",
    cell: ({ row }) => (
      <span className="font-medium">
        {formatCurrency(row.original.totalAmount)}
      </span>
    ),
    enableResizing: true,
    header: "Amount",
    id: "amount",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Amount",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 120,
    size: 140,
  },
  {
    accessorKey: "paidAt",
    cell: ({ row }) => formatDate(row.original.paidAt),
    enableResizing: true,
    header: "Paid at",
    id: "paidAt",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Paid at",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 120,
    size: 140,
  },
  {
    accessorKey: "submittedAt",
    cell: ({ row }) => formatDate(row.original.submittedAt),
    enableResizing: true,
    header: "Submitted",
    id: "submittedAt",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Submitted",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 120,
    size: 140,
  },
  {
    cell: ({ row }) => `${row.original.allocations.length} allocation(s)`,
    enableResizing: true,
    header: "Allocations",
    id: "allocations",
    maxSize: 170,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Allocations",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 120,
    size: 140,
  },
  {
    accessorKey: "paymentReference",
    cell: ({ row }) => row.original.paymentReference ?? "No reference",
    enableResizing: true,
    header: "Reference",
    id: "reference",
    maxSize: 220,
    meta: {
      className: "w-[170px] min-w-[140px]",
      headerLabel: "Reference",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 140,
    size: 170,
  },
  {
    cell: ({ row, table }) => {
      const receipt = row.original
      const meta = table.options.meta as PaymentReceiptTableMeta

      if (meta.mode === "member") {
        return (
          <div className="flex justify-end">
            <OpenMemberPaymentReceiptSupportSheet receiptId={receipt.id} />
          </div>
        )
      }

      return (
        <div className="flex flex-wrap justify-end gap-1">
          {receipt.status === "approved" ||
          receipt.status === "rejected" ? null : (
            <OpenPaymentReceiptReviewSheet receiptId={receipt.id} />
          )}
          <OpenPaymentReceiptSupportSheet receiptId={receipt.id} />
        </div>
      )
    },
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    header: "Actions",
    id: "actions",
    maxSize: 240,
    meta: {
      className:
        "text-right sticky right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-30 justify-center !border-l !border-border",
      headerLabel: "Actions",
      skeleton: { type: "icon" },
      sticky: true,
    },
    minSize: 200,
    size: 200,
  },
]
