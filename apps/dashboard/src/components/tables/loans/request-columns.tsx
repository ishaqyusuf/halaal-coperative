"use client"

import { formatCurrency } from "@halaalvest/utils"
import type { ColumnDef } from "@tanstack/react-table"
import { LoanStatusWord } from "@/components/loans/loan-status-word"
import {
  getGuarantorSummary,
  getLoanRequestWord,
} from "@/lib/loans/loan-words"
import { formatDayMonthYear } from "@/utils/format"
import { LoanRequestActionsMenu } from "./actions-menu"
import type { LoanRequestRow } from "./requests-table"

type LoanRequestTableMeta = {
  canReview: boolean
}

const guarantorToneClassNames = {
  attention: "text-amber-900",
  bad: "text-red-800",
  default: "text-muted-foreground",
  good: "text-emerald-800",
} as const

export const requestColumns: ColumnDef<LoanRequestRow>[] = [
  {
    accessorFn: (row) => row.member.fullName,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-base font-medium text-foreground">
          {row.original.member.fullName}
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {row.original.loanProduct.name}
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Member",
    id: "member",
    maxSize: 420,
    meta: {
      className:
        "w-[280px] min-w-[220px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Member",
      sticky: true,
    },
    minSize: 220,
    size: 280,
  },
  {
    accessorFn: (row) => row.requestedAmount,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-base text-foreground tabular-nums">
          {formatCurrency(Number(row.original.requestedAmount))}
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {row.original.requestedTermMonths} months ·{" "}
          {formatCurrency(Number(row.original.estimatedMonthlyServicing))} a
          month
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Amount",
    id: "request",
    maxSize: 360,
    meta: {
      className: "w-[280px] min-w-[240px]",
      headerLabel: "Amount",
    },
    minSize: 240,
    size: 280,
  },
  {
    cell: ({ row }) => {
      const summary = getGuarantorSummary(row.original.guarantorApprovals)

      return (
        <p
          className={`truncate text-base ${guarantorToneClassNames[summary.tone]}`}
        >
          {summary.label}
        </p>
      )
    },
    enableResizing: true,
    header: "Guarantors",
    id: "review",
    maxSize: 420,
    meta: {
      className: "w-[260px] min-w-[200px]",
      headerLabel: "Guarantors",
    },
    minSize: 200,
    size: 260,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => (
      <LoanStatusWord word={getLoanRequestWord(row.original.status)} />
    ),
    enableResizing: true,
    header: "Status",
    id: "status",
    maxSize: 220,
    meta: {
      className: "w-[160px] min-w-[140px]",
      headerLabel: "Status",
    },
    minSize: 140,
    size: 160,
  },
  {
    accessorFn: (row) => row.requestedAt,
    cell: ({ row }) => (
      <span className="text-base text-muted-foreground">
        {formatDayMonthYear(row.original.requestedAt) ?? "—"}
      </span>
    ),
    enableResizing: true,
    header: "Asked on",
    id: "requestedAt",
    maxSize: 220,
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Asked on",
    },
    minSize: 130,
    size: 150,
  },
  {
    cell: ({ row, table }) => {
      const meta = table.options.meta as LoanRequestTableMeta
      return (
        <LoanRequestActionsMenu
          canReview={meta.canReview}
          request={row.original}
        />
      )
    },
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    header: "Actions",
    id: "actions",
    maxSize: 200,
    meta: {
      className:
        "text-right sticky right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-30 justify-center !border-l !border-border",
      headerLabel: "Actions",
      sticky: true,
    },
    minSize: 160,
    size: 160,
  },
]
