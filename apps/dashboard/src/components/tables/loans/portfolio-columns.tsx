"use client"

import { formatCurrency } from "@halaalvest/utils"
import { Badge } from "@halaalvest/ui/components/badge"
import type { ColumnDef } from "@tanstack/react-table"
import { LoanPortfolioActionsMenu } from "./actions-menu"
import type { LoanPortfolioRow } from "./portfolio-table"

type LoanPortfolioTableMeta = {
  availablePool: number
  canReview: boolean
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={
        status === "active"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : status === "approved"
            ? "border-sky-200 bg-sky-50 text-sky-700"
            : "border-muted bg-muted text-muted-foreground"
      }
      variant="outline"
    >
      {status.replace(/_/g, " ")}
    </Badge>
  )
}

export const portfolioColumns: ColumnDef<LoanPortfolioRow>[] = [
  {
    accessorFn: (row) => row.member.fullName,
    cell: ({ row }) => (
      <div>
        <p className="truncate font-medium text-foreground">
          {row.original.member.fullName}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.termMonths} months
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Member",
    id: "member",
    maxSize: 520,
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
    accessorFn: (row) => row.loanProduct.name,
    cell: ({ row }) => (
      <div>
        <p className="truncate text-sm text-foreground">
          {row.original.loanProduct.name} · principal{" "}
          {formatCurrency(Number(row.original.principalAmount))}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          Outstanding {formatCurrency(Number(row.original.outstandingPrincipal))}
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Loan",
    id: "loan",
    maxSize: 380,
    meta: {
      className: "w-[300px] min-w-[240px]",
      headerLabel: "Loan",
    },
    minSize: 240,
    size: 300,
  },
  {
    accessorKey: "status",
    cell: ({ row, table }) => {
      const meta = table.options.meta as LoanPortfolioTableMeta

      return (
        <div>
          <StatusBadge status={row.original.status} />
          {row.original.status === "approved" &&
          Number(row.original.principalAmount) > Number(meta.availablePool) ? (
            <p className="mt-2 text-xs text-destructive">Liquidity warning</p>
          ) : null}
        </div>
      )
    },
    enableResizing: true,
    header: "Status",
    id: "status",
    maxSize: 180,
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Status",
    },
    minSize: 130,
    size: 150,
  },
  {
    accessorKey: "estimatedMonthlyServicing",
    cell: ({ row, table }) => {
      const meta = table.options.meta as LoanPortfolioTableMeta

      return (
        <div>
          <p className="truncate text-sm text-foreground">
            {formatCurrency(Number(row.original.estimatedMonthlyServicing))}{" "}
            monthly
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            Extra savings{" "}
            {formatCurrency(Number(row.original.extraMonthlySavingsAmount))}
          </p>
          {row.original.status === "approved" ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Pool after disbursement:{" "}
              {formatCurrency(
                Number(meta.availablePool) - Number(row.original.principalAmount)
              )}
            </p>
          ) : null}
        </div>
      )
    },
    enableResizing: true,
    header: "Servicing",
    id: "servicing",
    maxSize: 320,
    meta: {
      className: "w-[260px] min-w-[220px]",
      headerLabel: "Servicing",
    },
    minSize: 220,
    size: 260,
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
    maxSize: 180,
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
