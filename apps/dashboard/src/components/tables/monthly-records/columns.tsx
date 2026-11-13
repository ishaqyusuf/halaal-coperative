"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { formatCurrency } from "@halaalvest/utils"
import type { ColumnDef } from "@tanstack/react-table"
import {
  monthlyRecordStatusLabel,
  monthlyRecordStatusVariant,
} from "@/components/monthly-records/monthly-record-status"
import { MonthlyRecordRowActions } from "@/components/open-monthly-record-sheet"
import type { MonthlyRecordMemberTableRow } from "./data-table"

function loanStatusLabel(status: string) {
  return status === "none" ? "No loan" : status.replace(/_/g, " ")
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
        <p className="truncate text-muted-foreground">
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
        "w-[250px] min-w-[220px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Member",
      sticky: true,
    },
    minSize: 220,
    size: 250,
  },
  {
    accessorKey: "workplaceName",
    cell: ({ row }) => (
      <span className="truncate">{row.original.workplaceName ?? "—"}</span>
    ),
    enableResizing: true,
    header: "Workplace",
    id: "workplace",
    meta: {
      className: "w-[180px] min-w-[150px]",
      headerLabel: "Workplace",
    },
    minSize: 150,
    size: 180,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => (
      <Badge variant={monthlyRecordStatusVariant(row.original.status)}>
        {monthlyRecordStatusLabel(row.original.status)}
      </Badge>
    ),
    enableResizing: true,
    header: "Status",
    id: "status",
    meta: {
      className: "w-[140px] min-w-[130px]",
      headerLabel: "Status",
    },
    minSize: 130,
    size: 140,
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
    header: "Due",
    id: "payable",
    meta: {
      className: "w-[160px] min-w-[140px]",
      headerLabel: "Due",
    },
    minSize: 140,
    size: 160,
  },
  {
    accessorKey: "totalPaidAmount",
    cell: ({ row }) =>
      row.original.status === "applied"
        ? formatCurrency(row.original.totalPaidAmount)
        : "—",
    enableResizing: true,
    header: "Paid",
    id: "paid",
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Paid",
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
    cell: ({ row }) => <MonthlyRecordRowActions row={row.original} />,
    enableHiding: false,
    header: "Actions",
    id: "actions",
    maxSize: 300,
    meta: {
      className:
        "w-[240px] min-w-[230px] justify-end md:sticky md:right-0 z-30 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] !border-l !border-border",
      headerLabel: "Actions",
    },
    minSize: 230,
    size: 240,
  },
]
