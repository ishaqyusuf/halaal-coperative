"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import type { ColumnDef } from "@tanstack/react-table"
import type { AuditTableRow } from "./data-table"

function ActorBadge({ actorType }: { actorType: string }) {
  return (
    <Badge
      className={
        actorType === "user"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : actorType === "integration"
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-muted bg-muted text-muted-foreground"
      }
      variant="outline"
    >
      {actorType}
    </Badge>
  )
}

export const columns: ColumnDef<AuditTableRow>[] = [
  {
    accessorKey: "actionLabel",
    cell: ({ row }) => (
      <div>
        <p className="truncate font-medium text-foreground">
          {row.original.actionLabel}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.action}
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Action",
    id: "action",
    maxSize: 560,
    meta: {
      className:
        "w-[300px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Action",
      sticky: true,
    },
    minSize: 240,
    size: 300,
  },
  {
    accessorKey: "actorLabel",
    cell: ({ row }) => (
      <div>
        <p className="truncate text-foreground">{row.original.actorLabel}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.actorEmail ?? row.original.actorType}
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Actor",
    id: "actor",
    maxSize: 320,
    meta: {
      className: "w-[240px] min-w-[180px]",
      headerLabel: "Actor",
    },
    minSize: 180,
    size: 240,
  },
  {
    accessorKey: "actorType",
    cell: ({ row }) => <ActorBadge actorType={row.original.actorType} />,
    enableResizing: true,
    header: "Actor type",
    id: "actorType",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Actor type",
    },
    minSize: 120,
    size: 140,
  },
  {
    accessorKey: "entityType",
    cell: ({ row }) => (
      <div>
        <p className="truncate text-foreground">{row.original.entityType}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.entityId ?? "n/a"}
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Entity",
    id: "entity",
    maxSize: 320,
    meta: {
      className: "w-[240px] min-w-[180px]",
      headerLabel: "Entity",
    },
    minSize: 180,
    size: 240,
  },
  {
    accessorKey: "authorizerLabel",
    cell: ({ row }) => (
      <div>
        <p className="truncate text-foreground">
          {row.original.authorizerLabel}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.authorizationRole}
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Authorizer",
    id: "authorizer",
    maxSize: 320,
    meta: {
      className: "w-[240px] min-w-[180px]",
      headerLabel: "Authorizer",
    },
    minSize: 180,
    size: 240,
  },
  {
    accessorKey: "metadataSummary",
    cell: ({ row }) =>
      row.original.metadataSummary.length > 0
        ? row.original.metadataSummary.slice(0, 3).join(", ")
        : "No metadata",
    enableResizing: true,
    header: "Metadata",
    id: "metadata",
    maxSize: 420,
    meta: {
      className: "w-[280px] min-w-[220px]",
      headerLabel: "Metadata",
    },
    minSize: 220,
    size: 280,
  },
  {
    accessorKey: "occurredAt",
    cell: ({ row }) => row.original.occurredAt.toISOString(),
    enableResizing: true,
    header: "Occurred",
    id: "occurredAt",
    maxSize: 220,
    meta: {
      className: "w-[180px] min-w-[150px]",
      headerLabel: "Occurred",
    },
    minSize: 150,
    size: 180,
  },
]
