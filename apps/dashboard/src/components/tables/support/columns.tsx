"use client"

import type { SupportCaseListRow } from "@halaalvest/db"
import type { ColumnDef } from "@tanstack/react-table"
import { memo } from "react"
import { SupportStatusBadge } from "@/components/support/support-status-badge"
import {
  formatSupportDate,
  isSupportCaseFinished,
  type SupportViewer,
} from "@/lib/support/support-words"

export type SupportCase = SupportCaseListRow

type SupportTableMeta = {
  mode: SupportViewer
}

function viewerOf(meta: unknown): SupportViewer {
  return (meta as SupportTableMeta | undefined)?.mode ?? "staff"
}

export function isUrgentSupportCase(supportCase: SupportCase) {
  return (
    supportCase.priority === "urgent" &&
    !isSupportCaseFinished(supportCase.status)
  )
}

export function latestMessageAuthor(
  supportCase: SupportCase,
  viewer: SupportViewer
) {
  const author = supportCase.latestMessage?.authorType

  if (author === "staff") return viewer === "member" ? "Office" : "Staff"
  if (author === "member") return viewer === "member" ? "You" : "Member"

  return null
}

const CaseCell = memo(
  ({ supportCase, viewer }: { supportCase: SupportCase; viewer: SupportViewer }) => (
    <div className="min-w-0">
      <p className="truncate text-base font-medium text-foreground">
        {isUrgentSupportCase(supportCase) ? (
          <span className="mr-2 font-semibold text-red-700 dark:text-red-400">
            Urgent
          </span>
        ) : null}
        {supportCase.subject}
      </p>
      {viewer === "staff" ? (
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {supportCase.member
            ? `${supportCase.member.fullName} (${supportCase.member.memberNumber})`
            : "No member"}
        </p>
      ) : null}
    </div>
  )
)

CaseCell.displayName = "CaseCell"

const LastMessageCell = memo(
  ({ supportCase, viewer }: { supportCase: SupportCase; viewer: SupportViewer }) => {
    const message = supportCase.latestMessage
    if (!message) return <span className="text-muted-foreground">None</span>

    const author = latestMessageAuthor(supportCase, viewer)

    return (
      <div className="min-w-0">
        <p className="truncate text-base text-foreground">{message.message}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {author ? `${author}, ` : ""}
          {formatSupportDate(message.createdAt)}
        </p>
      </div>
    )
  }
)

LastMessageCell.displayName = "LastMessageCell"

export const columns: ColumnDef<SupportCase>[] = [
  {
    cell: ({ row, table }) => (
      <CaseCell
        supportCase={row.original}
        viewer={viewerOf(table.options.meta)}
      />
    ),
    enableResizing: true,
    header: "Question",
    id: "case",
    maxSize: 560,
    meta: {
      className:
        "w-[320px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Question",
      skeleton: { type: "avatar-text", width: "w-36" },
      sticky: true,
    },
    minSize: 240,
    size: 320,
  },
  {
    accessorKey: "status",
    cell: ({ row, table }) => (
      <SupportStatusBadge
        lastAuthor={row.original.latestMessage?.authorType}
        status={row.original.status}
        viewer={viewerOf(table.options.meta)}
      />
    ),
    enableResizing: true,
    header: "Status",
    id: "status",
    maxSize: 220,
    meta: {
      className: "w-[170px] min-w-[150px]",
      headerLabel: "Status",
      skeleton: { type: "badge" },
    },
    minSize: 150,
    size: 170,
  },
  {
    cell: ({ row, table }) => (
      <LastMessageCell
        supportCase={row.original}
        viewer={viewerOf(table.options.meta)}
      />
    ),
    enableResizing: true,
    header: "Last message",
    id: "latestReply",
    maxSize: 480,
    meta: {
      className: "w-[280px] min-w-[200px]",
      headerLabel: "Last message",
      skeleton: { type: "text", width: "w-40" },
    },
    minSize: 200,
    size: 280,
  },
  {
    accessorKey: "assignedToUser",
    cell: ({ row }) => row.original.assignedToUser?.fullName ?? "No one yet",
    enableResizing: true,
    header: "Handled by",
    id: "assignee",
    maxSize: 240,
    meta: {
      className: "w-[160px] min-w-[130px]",
      headerLabel: "Handled by",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 130,
    size: 160,
  },
  {
    accessorKey: "createdAt",
    cell: ({ row }) => formatSupportDate(row.original.createdAt),
    enableResizing: true,
    header: "Opened",
    id: "createdAt",
    maxSize: 200,
    meta: {
      className: "w-[130px] min-w-[120px]",
      headerLabel: "Opened",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 120,
    size: 130,
  },
]

/** Members don't see who handles their case. */
export const memberColumns = columns.filter((column) => column.id !== "assignee")
