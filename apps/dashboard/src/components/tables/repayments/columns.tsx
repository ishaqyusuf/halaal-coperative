"use client"

import { formatCurrency } from "@halaalvest/utils"
import type { ColumnDef } from "@tanstack/react-table"
import {
  RepaymentHistoryActionsMenu,
  RepaymentScheduleActionsMenu,
} from "./actions-menu"
import {
  describeFollowUp,
  formatRepaymentDate,
  getOutstandingAmount,
  InstallmentStatusWord,
  RepaymentStatusWord,
} from "./formatters"
import type { RepaymentHistoryRow, RepaymentScheduleRow } from "./types"

type RepaymentTableMeta = {
  canPostRepayment: boolean
}

export const scheduleColumns: ColumnDef<RepaymentScheduleRow>[] = [
  {
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-base font-medium">
          {row.original.loan.member.fullName}
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {row.original.loan.loanProduct.name}
        </p>
      </div>
    ),
    header: "Member",
    id: "member",
    minSize: 220,
    size: 280,
  },
  {
    cell: ({ row }) => (
      <span className="text-base">{formatRepaymentDate(row.original.dueAt)}</span>
    ),
    header: "Due",
    id: "dueAt",
    minSize: 140,
    size: 150,
  },
  {
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="text-base font-medium tabular-nums">
          {formatCurrency(getOutstandingAmount(row.original))}
        </p>
        {Number(row.original.amountPaid) > 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            of {formatCurrency(Number(row.original.totalDue))}
          </p>
        ) : null}
      </div>
    ),
    header: "Owed",
    id: "amount",
    minSize: 150,
    size: 160,
  },
  {
    cell: ({ row }) => <InstallmentStatusWord item={row.original} />,
    header: "Status",
    id: "status",
    minSize: 130,
    size: 140,
  },
  {
    cell: ({ row }) => {
      const followUp = describeFollowUp(row.original)
      return (
        <span
          className={
            followUp ? "truncate text-base" : "text-base text-muted-foreground"
          }
        >
          {followUp ?? "—"}
        </span>
      )
    },
    header: "Follow-up",
    id: "collections",
    minSize: 180,
    size: 220,
  },
  {
    cell: ({ row, table }) => (
      <RepaymentScheduleActionsMenu
        canPostRepayment={
          (table.options.meta as RepaymentTableMeta).canPostRepayment
        }
        item={row.original}
      />
    ),
    header: "Actions",
    id: "actions",
    minSize: 200,
    size: 210,
  },
]

export const historyColumns: ColumnDef<RepaymentHistoryRow>[] = [
  {
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-base font-medium">
          {row.original.member.fullName}
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {row.original.loan.loanProduct.name}
        </p>
      </div>
    ),
    header: "Member",
    id: "repayment",
    minSize: 220,
    size: 300,
  },
  {
    cell: ({ row }) => (
      <span className="text-base">{formatRepaymentDate(row.original.paidAt)}</span>
    ),
    header: "Paid on",
    id: "paidAt",
    minSize: 140,
    size: 150,
  },
  {
    cell: ({ row }) => (
      <span className="text-base font-medium tabular-nums">
        {formatCurrency(Number(row.original.amount))}
      </span>
    ),
    header: "Amount",
    id: "amount",
    minSize: 140,
    size: 150,
  },
  {
    cell: ({ row }) => (
      <span className="truncate text-base text-muted-foreground">
        {row.original.reference || "—"}
      </span>
    ),
    header: "Reference",
    id: "reference",
    minSize: 160,
    size: 180,
  },
  {
    cell: ({ row }) => <RepaymentStatusWord item={row.original} />,
    header: "Status",
    id: "status",
    minSize: 130,
    size: 140,
  },
  {
    cell: ({ row }) => <RepaymentHistoryActionsMenu item={row.original} />,
    header: "Actions",
    id: "actions",
    minSize: 100,
    size: 110,
  },
]
