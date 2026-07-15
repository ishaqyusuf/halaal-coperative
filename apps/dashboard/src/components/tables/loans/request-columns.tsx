"use client"

import { formatCurrency } from "@halaalvest/utils"
import { Badge } from "@halaalvest/ui/components/badge"
import type { ColumnDef } from "@tanstack/react-table"
import { LoanRequestActionsMenu } from "./actions-menu"
import type { LoanRequestRow } from "./requests-table"

type LoanRequestTableMeta = {
  canReview: boolean
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={
        status === "approved"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : status === "rejected"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
      }
      variant="outline"
    >
      {status.replace(/_/g, " ")}
    </Badge>
  )
}

export const requestColumns: ColumnDef<LoanRequestRow>[] = [
  {
    accessorFn: (row) => row.member.fullName,
    cell: ({ row }) => (
      <div>
        <p className="truncate font-medium text-foreground">
          {row.original.member.fullName}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.requestedTermMonths} months
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
    accessorFn: (row) => row.requestedAmount,
    cell: ({ row }) => (
      <div>
        <p className="truncate text-sm text-foreground">
          {row.original.loanProduct.name} ·{" "}
          {formatCurrency(Number(row.original.requestedAmount))}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          Monthly servicing{" "}
          {formatCurrency(Number(row.original.estimatedMonthlyServicing))} ·
          extra savings{" "}
          {formatCurrency(Number(row.original.extraMonthlySavingsAmount))}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          Eligible snapshot{" "}
          {formatCurrency(Number(row.original.eligibleAmountSnapshot))}
          {row.original.reviewNotes ? ` · ${row.original.reviewNotes}` : ""}
        </p>
        {row.original.purpose ? (
          <p className="mt-2 truncate text-sm text-muted-foreground">
            {row.original.purpose}
          </p>
        ) : null}
      </div>
    ),
    enableResizing: true,
    header: "Request",
    id: "request",
    maxSize: 520,
    meta: {
      className: "w-[380px] min-w-[300px]",
      headerLabel: "Request",
    },
    minSize: 300,
    size: 380,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
    cell: ({ row, table }) => {
      const meta = table.options.meta as LoanRequestTableMeta
      const pendingGuarantors = row.original.guarantorApprovals.filter(
        (approval) => approval.status === "pending"
      )
      const reviewCount = row.original.approvals.length
      const guarantorCount = row.original.guarantorApprovals.length

      return (
        <div>
          <p className="truncate text-sm text-foreground">
            {reviewCount
              ? `${reviewCount} review action${reviewCount === 1 ? "" : "s"}`
              : "No review action yet"}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {guarantorCount
              ? `${guarantorCount} guarantor record${guarantorCount === 1 ? "" : "s"}`
              : "No guarantor records"}
            {pendingGuarantors.length
              ? ` · ${pendingGuarantors.length} pending`
              : ""}
          </p>
          {meta.canReview && pendingGuarantors[0] ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">
              Next guarantor: {pendingGuarantors[0].guarantorMember.fullName}
            </p>
          ) : null}
        </div>
      )
    },
    enableResizing: true,
    header: "Review",
    id: "review",
    maxSize: 520,
    meta: {
      className: "w-[380px] min-w-[300px]",
      headerLabel: "Review",
    },
    minSize: 300,
    size: 380,
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
    maxSize: 260,
    meta: {
      className:
        "text-right sticky right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-30 justify-center !border-l !border-border",
      headerLabel: "Actions",
      sticky: true,
    },
    minSize: 240,
    size: 240,
  },
]
