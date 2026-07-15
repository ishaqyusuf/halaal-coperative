"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import type { ColumnDef } from "@tanstack/react-table"
import { MembershipApprovalActionsMenu } from "./actions-menu"
import type { MembershipApprovalRow } from "./data-table"

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      className={
        status === "approved"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : status === "rejected"
            ? "border-red-200 bg-red-50 text-red-700"
            : status === "pending_approval"
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-muted bg-muted text-muted-foreground"
      }
      variant="outline"
    >
      {status.replace(/_/g, " ")}
    </Badge>
  )
}

export const columns: ColumnDef<MembershipApprovalRow>[] = [
  {
    accessorKey: "fullName",
    cell: ({ row }) => (
      <div>
        <p className="truncate font-medium text-foreground">
          {row.original.fullName}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {row.original.email}
        </p>
      </div>
    ),
    enableResizing: true,
    header: "Applicant",
    id: "applicant",
    maxSize: 520,
    meta: {
      className:
        "w-[300px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Applicant",
      sticky: true,
    },
    minSize: 240,
    size: 300,
  },
  {
    accessorKey: "memberNumber",
    cell: ({ row }) => row.original.memberNumber,
    enableResizing: true,
    header: "Cooperative number",
    id: "number",
    maxSize: 220,
    meta: {
      className: "w-[180px] min-w-[150px]",
      headerLabel: "Cooperative number",
    },
    minSize: 150,
    size: 180,
  },
  {
    accessorKey: "phoneNumber",
    cell: ({ row }) => row.original.phoneNumber ?? "No phone",
    enableResizing: true,
    header: "Phone",
    id: "phone",
    maxSize: 220,
    meta: {
      className: "w-[180px] min-w-[150px]",
      headerLabel: "Phone",
    },
    minSize: 150,
    size: 180,
  },
  {
    accessorKey: "emailVerifiedAt",
    cell: ({ row }) => (
      <Badge
        className={
          row.original.emailVerifiedAt
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }
        variant="outline"
      >
        {row.original.emailVerifiedAt ? "Verified" : "Pending"}
      </Badge>
    ),
    enableResizing: true,
    header: "Verification",
    id: "verification",
    maxSize: 180,
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Verification",
    },
    minSize: 130,
    size: 150,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    enableResizing: true,
    header: "Status",
    id: "status",
    maxSize: 190,
    meta: {
      className: "w-[160px] min-w-[140px]",
      headerLabel: "Status",
    },
    minSize: 140,
    size: 160,
  },
  {
    accessorKey: "createdAt",
    cell: ({ row }) => row.original.createdAt.toISOString().slice(0, 10),
    enableResizing: true,
    header: "Submitted",
    id: "submitted",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Submitted",
    },
    minSize: 120,
    size: 140,
  },
  {
    cell: ({ row }) => <MembershipApprovalActionsMenu request={row.original} />,
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    header: "Actions",
    id: "actions",
    maxSize: 120,
    meta: {
      className:
        "text-right sticky right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-30 justify-center !border-l !border-border",
      headerLabel: "Actions",
      sticky: true,
    },
    minSize: 100,
    size: 100,
  },
]
