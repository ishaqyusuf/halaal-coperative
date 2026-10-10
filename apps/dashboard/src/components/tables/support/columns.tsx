"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import type { SupportCaseRow, SupportCaseStatus } from "@halaalvest/db"
import type { ColumnDef } from "@tanstack/react-table"
import { memo } from "react"
import { SupportActionsMenu } from "./actions-menu"

export type SupportCase = SupportCaseRow

type SupportTableMeta = {
  canReviewFinancialAdjustments: boolean
  mode: "member" | "staff"
}

export function labelFromValue(value: string) {
  return value.replace(/_/g, " ")
}

export function formatSupportDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function statusClassName(status: SupportCaseStatus) {
  if (status === "resolved" || status === "closed") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "waiting_on_member") {
    return "border-amber-200 bg-amber-50 text-amber-700"
  }

  return "border-sky-200 bg-sky-50 text-sky-700"
}

function latestMessage(caseRow: SupportCase) {
  return caseRow.messages.at(-1)
}

export function linkedRecordLabel(caseRow: SupportCase) {
  if (!caseRow.linkedRecordId || !caseRow.linkedRecordType) {
    return "No linked record"
  }

  const label =
    caseRow.linkedRecordType === "receipt"
      ? "Receipt"
      : labelFromValue(caseRow.linkedRecordType)

  return `${label} ${caseRow.linkedRecordId.slice(0, 8)}`
}

const CaseCell = memo(({ supportCase }: { supportCase: SupportCase }) => (
  <div>
    <p className="truncate font-medium text-foreground">
      {supportCase.subject}
    </p>
    <p className="mt-1 truncate text-xs text-muted-foreground">
      {supportCase.member
        ? `${supportCase.member.fullName} · ${supportCase.member.memberNumber}`
        : "No member linked"}
    </p>
  </div>
))

CaseCell.displayName = "CaseCell"

export const SupportStatusBadge = memo(
  ({ status }: { status: SupportCaseStatus }) => (
    <Badge className={statusClassName(status)} variant="outline">
      {labelFromValue(status)}
    </Badge>
  )
)

SupportStatusBadge.displayName = "SupportStatusBadge"

export const columns: ColumnDef<SupportCase>[] = [
  {
    cell: ({ row }) => <CaseCell supportCase={row.original} />,
    enableResizing: true,
    header: "Case",
    id: "case",
    maxSize: 560,
    meta: {
      className:
        "w-[340px] min-w-[250px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Case",
      skeleton: { type: "avatar-text", width: "w-36" },
      sticky: true,
    },
    minSize: 250,
    size: 340,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => <SupportStatusBadge status={row.original.status} />,
    enableResizing: true,
    header: "Status",
    id: "status",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Status",
      skeleton: { type: "badge" },
    },
    minSize: 120,
    size: 140,
  },
  {
    accessorKey: "category",
    cell: ({ row }) => labelFromValue(row.original.category),
    enableResizing: true,
    header: "Category",
    id: "category",
    maxSize: 220,
    meta: {
      className: "w-[170px] min-w-[140px]",
      headerLabel: "Category",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 140,
    size: 170,
  },
  {
    accessorKey: "priority",
    cell: ({ row }) => labelFromValue(row.original.priority),
    enableResizing: true,
    header: "Priority",
    id: "priority",
    maxSize: 160,
    meta: {
      className: "w-[130px] min-w-[110px]",
      headerLabel: "Priority",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 110,
    size: 130,
  },
  {
    accessorKey: "assignedToUser",
    cell: ({ row }) => row.original.assignedToUser?.fullName ?? "Unassigned",
    enableResizing: true,
    header: "Assignee",
    id: "assignee",
    maxSize: 220,
    meta: {
      className: "w-[170px] min-w-[140px]",
      headerLabel: "Assignee",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 140,
    size: 170,
  },
  {
    cell: ({ row }) => {
      const message = latestMessage(row.original)

      if (!message) {
        return "No replies"
      }

      return (
        <div>
          <p className="truncate">{message.message}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {message.authorUser?.fullName ?? message.authorType} ·{" "}
            {formatSupportDate(message.createdAt)}
          </p>
        </div>
      )
    },
    enableResizing: true,
    header: "Latest reply",
    id: "latestReply",
    maxSize: 320,
    meta: {
      className: "w-[240px] min-w-[180px]",
      headerLabel: "Latest reply",
      skeleton: { type: "text", width: "w-32" },
    },
    minSize: 180,
    size: 240,
  },
  {
    cell: ({ row }) => linkedRecordLabel(row.original),
    enableResizing: true,
    header: "Linked record",
    id: "linkedRecord",
    maxSize: 220,
    meta: {
      className: "w-[170px] min-w-[140px]",
      headerLabel: "Linked record",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 140,
    size: 170,
  },
  {
    accessorKey: "createdAt",
    cell: ({ row }) => formatSupportDate(row.original.createdAt),
    enableResizing: true,
    header: "Opened",
    id: "createdAt",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Opened",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 120,
    size: 140,
  },
  {
    cell: ({ row, table }) => {
      const meta = table.options.meta as SupportTableMeta
      const supportCase = row.original
      return (
        <SupportActionsMenu
          canReviewFinancialAdjustments={meta.canReviewFinancialAdjustments}
          mode={meta.mode}
          supportCase={supportCase}
        />
      )
    },
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    header: "Actions",
    id: "actions",
    maxSize: 80,
    meta: {
      className:
        "text-right sticky right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-30 justify-center !border-l !border-border",
      headerLabel: "Actions",
      skeleton: { type: "icon" },
      sticky: true,
    },
    minSize: 72,
    size: 72,
  },
]
