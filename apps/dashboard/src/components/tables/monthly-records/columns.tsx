"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { formatCurrency } from "@halaalvest/utils"
import type { ColumnDef } from "@tanstack/react-table"
import {
  OpenMonthlyRecordApplySheet,
  OpenMonthlyRecordCancelSheet,
} from "@/components/open-monthly-record-sheet"
import type { MonthlyRecordMemberTableRow } from "./data-table"

function statusVariant(status: string) {
  if (status === "applied" || status === "open") return "default"
  if (status === "cancelled" || status === "closed") return "destructive"
  return "secondary"
}

function loanStatusLabel(status: string) {
  return status === "none" ? "No loan" : status.replace(/_/g, " ")
}

function monthlyRecordMemberStatusLabel(status: string) {
  return status === "pending" ? "staged" : status
}

function AmountWithCalculatedDifference({
  actual,
  calculated,
  hasDifference,
}: {
  actual: number
  calculated: number
  hasDifference: boolean
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{formatCurrency(actual)}</span>
      {hasDifference ? (
        <span className="text-muted-foreground line-through">
          {formatCurrency(calculated)}
        </span>
      ) : null}
    </span>
  )
}

export const columns: ColumnDef<MonthlyRecordMemberTableRow>[] = [
  {
    accessorKey: "memberName",
    cell: ({ row }) => (
      <div>
        <p className="truncate font-medium text-foreground">
          {row.original.memberName}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.memberNumber}
        </p>
      </div>
    ),
    enableHiding: false,
    enableResizing: true,
    header: "Member",
    id: "member",
    maxSize: 460,
    meta: {
      className:
        "w-[300px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Member",
      sticky: true,
    },
    minSize: 240,
    size: 300,
  },
  {
    accessorKey: "currentBalance",
    cell: ({ row }) => formatCurrency(row.original.currentBalance),
    enableResizing: true,
    header: "Current balance",
    id: "balance",
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "Current balance",
    },
    minSize: 150,
    size: 170,
  },
  {
    accessorKey: "loanStatus",
    cell: ({ row }) => (
      <Badge variant={row.original.loanStatus === "none" ? "secondary" : "outline"}>
        {loanStatusLabel(row.original.loanStatus)}
      </Badge>
    ),
    enableResizing: true,
    header: "Loan status",
    id: "loanStatus",
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Loan status",
    },
    minSize: 130,
    size: 150,
  },
  {
    accessorKey: "contributionAmount",
    cell: ({ row }) => formatCurrency(row.original.contributionAmount),
    enableResizing: true,
    header: "Savings due",
    id: "savings",
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Savings due",
    },
    minSize: 130,
    size: 150,
  },
  {
    accessorKey: "shareChargeAmount",
    cell: ({ row }) => formatCurrency(row.original.shareChargeAmount),
    enableResizing: true,
    header: "Share charge",
    id: "shareCharge",
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Share charge",
    },
    minSize: 130,
    size: 150,
  },
  {
    accessorKey: "loanRepaymentAmount",
    cell: ({ row }) => formatCurrency(row.original.loanRepaymentAmount),
    enableResizing: true,
    header: "Loan due",
    id: "loanDue",
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Loan due",
    },
    minSize: 130,
    size: 150,
  },
  {
    accessorKey: "totalPayableAmount",
    cell: ({ row }) => formatCurrency(row.original.totalPayableAmount),
    enableResizing: true,
    header: "Total payable",
    id: "payable",
    meta: {
      className: "w-[160px] min-w-[140px]",
      headerLabel: "Total payable",
    },
    minSize: 140,
    size: 160,
  },
  {
    accessorKey: "totalPaidAmount",
    cell: ({ row }) => formatCurrency(row.original.totalPaidAmount),
    enableResizing: true,
    header: "Total paid",
    id: "paid",
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Total paid",
    },
    minSize: 130,
    size: 150,
  },
  {
    accessorKey: "allChargesAmount",
    cell: ({ row }) => (
      <AmountWithCalculatedDifference
        actual={row.original.allChargesAmount}
        calculated={row.original.calculatedChargesAmount}
        hasDifference={row.original.hasChargeDifference}
      />
    ),
    enableResizing: true,
    header: "All charges",
    id: "charges",
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "All charges",
    },
    minSize: 150,
    size: 170,
  },
  {
    accessorKey: "finalIncomeAmount",
    cell: ({ row }) => (
      <AmountWithCalculatedDifference
        actual={row.original.finalIncomeAmount}
        calculated={row.original.calculatedFinalIncomeAmount}
        hasDifference={row.original.hasFinalIncomeDifference}
      />
    ),
    enableResizing: true,
    header: "Final income",
    id: "finalIncome",
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "Final income",
    },
    minSize: 150,
    size: 170,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => (
      <Badge variant={statusVariant(row.original.status)}>
        {monthlyRecordMemberStatusLabel(row.original.status)}
      </Badge>
    ),
    enableResizing: true,
    header: "Status",
    id: "status",
    meta: {
      className: "w-[130px] min-w-[110px]",
      headerLabel: "Status",
    },
    minSize: 110,
    size: 130,
  },
  {
    cell: ({ row }) => {
      const canApply = row.original.status !== "applied"
      const canCancel = row.original.status !== "cancelled"

      return (
        <div className="flex justify-end gap-2">
          <OpenMonthlyRecordApplySheet
            disabled={!canApply}
            monthlyRecordMemberId={row.original.id}
          />
          <OpenMonthlyRecordCancelSheet
            disabled={!canCancel}
            monthlyRecordMemberId={row.original.id}
          />
        </div>
      )
    },
    enableHiding: false,
    header: "Actions",
    id: "actions",
    maxSize: 220,
    meta: {
      className: "w-[200px] min-w-[180px] justify-end",
      headerLabel: "Actions",
    },
    minSize: 180,
    size: 200,
  },
]
