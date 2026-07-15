"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import type { ColumnDef } from "@tanstack/react-table"
import type { NotificationDeliveryRow } from "./data-table"

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={
        status === "sent"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : status === "failed"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
      }
      variant="outline"
    >
      {status}
    </Badge>
  )
}

export const columns: ColumnDef<NotificationDeliveryRow>[] = [
  {
    accessorKey: "notificationType",
    cell: ({ row }) => (
      <div>
        <p className="truncate font-medium text-foreground">
          {row.original.notificationType}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.action}
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Subject",
    id: "subject",
    maxSize: 520,
    meta: {
      className:
        "w-[320px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Subject",
      sticky: true,
    },
    minSize: 240,
    size: 320,
  },
  {
    accessorKey: "recipient",
    cell: ({ row }) => row.original.recipient,
    enableResizing: true,
    header: "Recipient",
    id: "recipient",
    maxSize: 320,
    meta: {
      className: "w-[240px] min-w-[180px]",
      headerLabel: "Recipient",
    },
    minSize: 180,
    size: 240,
  },
  {
    accessorKey: "notificationType",
    cell: ({ row }) => row.original.notificationType,
    enableResizing: true,
    header: "Type",
    id: "type",
    maxSize: 260,
    meta: {
      className: "w-[220px] min-w-[180px]",
      headerLabel: "Type",
    },
    minSize: 180,
    size: 220,
  },
  {
    accessorKey: "deliveryStatus",
    cell: ({ row }) => <StatusBadge status={row.original.deliveryStatus} />,
    enableResizing: true,
    header: "Status",
    id: "status",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Status",
    },
    minSize: 120,
    size: 140,
  },
  {
    accessorKey: "occurredAt",
    cell: ({ row }) => row.original.occurredAt.toISOString().slice(0, 10),
    enableResizing: true,
    header: "Created",
    id: "createdAt",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Created",
    },
    minSize: 120,
    size: 140,
  },
]
