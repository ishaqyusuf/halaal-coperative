"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { RepaymentHistoryActionsMenu, RepaymentScheduleActionsMenu } from "./actions-menu"
import {
  formatRepaymentDate,
  HistoryAmount,
  RepaymentStatusBadge,
  ScheduleAmount,
} from "./formatters"
import type { RepaymentHistoryRow, RepaymentScheduleRow } from "./types"

type RepaymentTableMeta = {
  canPostRepayment: boolean
}

export const scheduleColumns: ColumnDef<RepaymentScheduleRow>[] = [
  {
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.loan.member.fullName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.original.loan.member.memberNumber} · {row.original.loan.loanProduct.name}
        </p>
      </div>
    ),
    header: "Member",
    id: "member",
    minSize: 240,
    size: 300,
  },
  {
    cell: ({ row }) => `#${row.original.installmentNumber}`,
    header: "Installment",
    id: "installment",
    minSize: 110,
    size: 120,
  },
  {
    cell: ({ row }) => formatRepaymentDate(row.original.dueAt),
    header: "Due date",
    id: "dueAt",
    minSize: 140,
    size: 150,
  },
  {
    cell: ({ row }) => <RepaymentStatusBadge status={row.original.status} />,
    header: "Status",
    id: "status",
    minSize: 130,
    size: 140,
  },
  {
    cell: ({ row }) => <ScheduleAmount item={row.original} />,
    header: "Repayment",
    id: "amount",
    minSize: 170,
    size: 180,
  },
  {
    cell: ({ row }) => {
      const followUp = row.original.latestCollectionFollowUp
      return followUp ? (
        <div>
          <p className="capitalize">{followUp.caseStage?.replaceAll("_", " ")}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {followUp.assignedToUser?.fullName ?? "Unassigned"}
          </p>
        </div>
      ) : (
        <span className="text-muted-foreground">No follow-up</span>
      )
    },
    header: "Collections",
    id: "collections",
    minSize: 160,
    size: 180,
  },
  {
    cell: ({ row, table }) => (
      <RepaymentScheduleActionsMenu
        canPostRepayment={(table.options.meta as RepaymentTableMeta).canPostRepayment}
        item={row.original}
      />
    ),
    header: "Actions",
    id: "actions",
    minSize: 80,
    size: 88,
  },
]

export const historyColumns: ColumnDef<RepaymentHistoryRow>[] = [
  {
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.member.fullName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {row.original.member.memberNumber} · {row.original.loan.loanProduct.name}
        </p>
      </div>
    ),
    header: "Member",
    id: "repayment",
    minSize: 240,
    size: 320,
  },
  {
    cell: ({ row }) => formatRepaymentDate(row.original.paidAt),
    header: "Paid on",
    id: "paidAt",
    minSize: 140,
    size: 150,
  },
  {
    cell: ({ row }) => <RepaymentStatusBadge status={row.original.status} />,
    header: "Status",
    id: "status",
    minSize: 130,
    size: 140,
  },
  {
    cell: ({ row }) => <HistoryAmount item={row.original} />,
    header: "Amount",
    id: "amount",
    minSize: 140,
    size: 150,
  },
  {
    cell: ({ row }) => row.original.reference || "—",
    header: "Reference",
    id: "reference",
    minSize: 160,
    size: 180,
  },
  {
    cell: ({ row }) => <RepaymentHistoryActionsMenu item={row.original} />,
    header: "Actions",
    id: "actions",
    minSize: 80,
    size: 88,
  },
]
