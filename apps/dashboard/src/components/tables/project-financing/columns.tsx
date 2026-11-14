"use client"

import { formatCurrency } from "@halaalvest/utils"
import type { ProjectFinancingRequestRow } from "@halaalvest/db"
import type { ColumnDef } from "@tanstack/react-table"
import { memo } from "react"
import { RequestStatusBadge } from "@/components/requests/request-status-badge"
import {
  getProjectFinancingTypeLabel,
  monthlyAmount,
} from "@/lib/requests/request-status-words"
import { formatDayMonthYear } from "@/utils/format"

export type ProjectFinancingRequest = ProjectFinancingRequestRow

/** The amount that counts now: approved when approved, else what was asked. */
export function getProjectFinancingAmount(request: ProjectFinancingRequest) {
  const approved = request.approvedAmount !== null
  const type = request.approvedStructure ?? request.proposedStructure
  const amount = approved
    ? (request.approvedAmount ?? 0)
    : request.requestedAmount
  const months = approved
    ? request.approvedPaybackMonths
    : request.requestedPaybackMonths

  return {
    amount,
    monthly:
      type === "repayable_facility"
        ? (request.approvedMonthlyPayback ??
          request.estimatedMonthlyPayback ??
          monthlyAmount(amount, months ?? 0))
        : null,
    repayable: type === "repayable_facility",
    type,
  }
}

export function getProjectFinancingOwed(request: ProjectFinancingRequest) {
  const { repayable } = getProjectFinancingAmount(request)

  if (!repayable || !request.disbursedAt) return null

  return Math.max(0, (request.approvedAmount ?? 0) - (request.paidAmount ?? 0))
}

export function ProjectFinancingStatusBadge({
  request,
}: {
  request: ProjectFinancingRequest
}) {
  return (
    <RequestStatusBadge
      kind="projectFinancing"
      repayable={getProjectFinancingAmount(request).repayable}
      status={request.status}
    />
  )
}

const RequestCell = memo(
  ({ request }: { request: ProjectFinancingRequest }) => (
    <div className="min-w-0">
      <p className="truncate font-medium text-foreground">
        {request.businessName}
      </p>
      <p className="mt-0.5 truncate text-sm text-muted-foreground">
        {request.member.fullName}
      </p>
    </div>
  )
)

RequestCell.displayName = "RequestCell"

export const columns: ColumnDef<ProjectFinancingRequest>[] = [
  {
    cell: ({ row }) => <RequestCell request={row.original} />,
    enableResizing: true,
    header: "Business",
    id: "request",
    maxSize: 520,
    meta: {
      className:
        "w-[300px] min-w-[220px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Business",
      skeleton: { type: "avatar-text", width: "w-36" },
      sticky: true,
    },
    minSize: 220,
    size: 300,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => <ProjectFinancingStatusBadge request={row.original} />,
    enableResizing: true,
    enableSorting: false,
    header: "Status",
    id: "status",
    maxSize: 200,
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Status",
      skeleton: { type: "badge" },
    },
    minSize: 130,
    size: 150,
  },
  {
    accessorKey: "requestedAmount",
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">
        {formatCurrency(getProjectFinancingAmount(row.original).amount)}
      </span>
    ),
    enableResizing: true,
    header: "Amount",
    id: "requested",
    maxSize: 240,
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "Amount",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 150,
    size: 170,
  },
  {
    cell: ({ row }) =>
      getProjectFinancingTypeLabel(
        getProjectFinancingAmount(row.original).type
      ),
    enableResizing: true,
    enableSorting: false,
    header: "Paid back by",
    id: "approved",
    maxSize: 240,
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "Paid back by",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 150,
    size: 170,
  },
  {
    cell: ({ row }) => {
      const owed = getProjectFinancingOwed(row.original)
      const { monthly } = getProjectFinancingAmount(row.original)

      if (owed === null && !monthly) {
        return <span className="text-muted-foreground">—</span>
      }

      return (
        <div>
          <p className="font-medium tabular-nums">
            {formatCurrency(owed ?? monthly ?? 0)}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {owed !== null ? "still owed" : "a month"}
          </p>
        </div>
      )
    },
    enableResizing: true,
    enableSorting: false,
    header: "Repayment",
    id: "monthly",
    maxSize: 240,
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "Repayment",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 150,
    size: 170,
  },
  {
    accessorKey: "requestedAt",
    cell: ({ row }) => formatDayMonthYear(row.original.requestedAt),
    enableResizing: true,
    header: "Asked on",
    id: "requestedAt",
    maxSize: 220,
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Asked on",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 130,
    size: 150,
  },
  {
    accessorKey: "disbursedAt",
    cell: ({ row }) => formatDayMonthYear(row.original.disbursedAt) ?? "—",
    enableResizing: true,
    header: "Paid out on",
    id: "disbursed",
    maxSize: 220,
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Paid out on",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 130,
    size: 150,
  },
]
