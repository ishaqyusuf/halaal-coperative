"use client"

import { formatCurrency } from "@halaalvest/utils"
import type { ColumnDef } from "@tanstack/react-table"
import { LoanStatusWord } from "@/components/loans/loan-status-word"
import { getLoanWord } from "@/lib/loans/loan-words"
import { LoanPortfolioActionsMenu } from "./actions-menu"
import type { LoanPortfolioRow } from "./portfolio-table"

type LoanPortfolioTableMeta = {
  canReview: boolean
}

export const portfolioColumns: ColumnDef<LoanPortfolioRow>[] = [
  {
    accessorFn: (row) => row.member.fullName,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-base font-medium text-foreground">
          {row.original.member.fullName}
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {row.original.termMonths} months
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
    accessorFn: (row) => row.outstandingPrincipal,
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="truncate text-base text-foreground tabular-nums">
          {formatCurrency(Number(row.original.outstandingPrincipal))}
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          of {formatCurrency(Number(row.original.principalAmount))} lent
        </p>
      </div>
    ),
    enableResizing: true,
    enableSorting: false,
    header: "Still owed",
    id: "owed",
    maxSize: 320,
    meta: {
      className: "w-[220px] min-w-[180px]",
      headerLabel: "Still owed",
    },
    minSize: 180,
    size: 220,
  },
  {
    accessorKey: "estimatedMonthlyServicing",
    cell: ({ row }) => (
      <span className="text-base text-foreground tabular-nums">
        {formatCurrency(Number(row.original.estimatedMonthlyServicing))}
      </span>
    ),
    enableResizing: true,
    header: "Each month",
    id: "servicing",
    maxSize: 260,
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "Each month",
    },
    minSize: 150,
    size: 170,
  },
  {
    accessorFn: (row) => row.loanProduct.name,
    cell: ({ row }) => (
      <span className="truncate text-base text-muted-foreground">
        {row.original.loanProduct.name}
      </span>
    ),
    enableResizing: true,
    header: "Type of loan",
    id: "loan",
    maxSize: 360,
    meta: {
      className: "w-[220px] min-w-[180px]",
      headerLabel: "Type of loan",
    },
    minSize: 180,
    size: 220,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => <LoanStatusWord word={getLoanWord(row.original.status)} />,
    enableResizing: true,
    header: "Status",
    id: "status",
    maxSize: 240,
    meta: {
      className: "w-[180px] min-w-[150px]",
      headerLabel: "Status",
    },
    minSize: 150,
    size: 180,
  },
  {
    cell: ({ row, table }) => {
      const meta = table.options.meta as LoanPortfolioTableMeta
      return (
        <LoanPortfolioActionsMenu
          canReview={meta.canReview}
          loan={row.original}
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
