"use client"

import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"
import { Badge } from "@halaalvest/ui/components/badge"
import type { ColumnDef } from "@tanstack/react-table"
import { memo } from "react"
import { MembershipApprovalActionsMenu } from "./actions-menu"

export type MembershipApprovalRow =
  RouterOutputs["onboarding"]["membershipApprovals"]["data"][number]

export function formatMembershipApprovalStatus(status: string) {
  if (status === "pending_email_verification") {
    return "Awaiting verification"
  }

  if (status === "pending_approval") {
    return "Pending approval"
  }

  return `${status.charAt(0).toUpperCase()}${status.slice(1).replaceAll("_", " ")}`
}

export const MembershipApprovalStatusBadge = memo(
  function MembershipApprovalStatusBadge({ status }: { status: string }) {
    return (
      <Badge
        className={
          status === "approved"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : status === "rejected" || status === "cancelled"
              ? "border-red-200 bg-red-50 text-red-700"
              : status === "pending_approval"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-muted bg-muted text-muted-foreground"
        }
        variant="outline"
      >
        {formatMembershipApprovalStatus(status)}
      </Badge>
    )
  }
)

export const MembershipApprovalVerificationBadge = memo(
  function MembershipApprovalVerificationBadge({
    verified,
  }: {
    verified: boolean
  }) {
    return (
      <Badge
        className={
          verified
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-amber-200 bg-amber-50 text-amber-700"
        }
        variant="outline"
      >
        {verified ? "Verified" : "Pending"}
      </Badge>
    )
  }
)

MembershipApprovalStatusBadge.displayName = "MembershipApprovalStatusBadge"
MembershipApprovalVerificationBadge.displayName =
  "MembershipApprovalVerificationBadge"

const ApplicantCell = memo(function ApplicantCell({
  email,
  fullName,
}: {
  email: string
  fullName: string
}) {
  return (
    <div>
      <p className="truncate font-medium text-foreground">{fullName}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{email}</p>
    </div>
  )
})

export const columns: ColumnDef<MembershipApprovalRow>[] = [
  {
    accessorKey: "fullName",
    cell: ({ row }) => (
      <ApplicantCell
        email={row.original.email}
        fullName={row.original.fullName}
      />
    ),
    enableResizing: true,
    header: "Applicant",
    id: "applicant",
    maxSize: 520,
    meta: {
      className:
        "w-[300px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Applicant",
      skeleton: { type: "avatar-text", width: "w-32" },
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
      skeleton: { type: "text", width: "w-20" },
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
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 150,
    size: 180,
  },
  {
    accessorKey: "emailVerifiedAt",
    cell: ({ row }) => (
      <MembershipApprovalVerificationBadge
        verified={Boolean(row.original.emailVerifiedAt)}
      />
    ),
    enableResizing: true,
    header: "Verification",
    id: "verification",
    maxSize: 180,
    meta: {
      className: "w-[150px] min-w-[130px]",
      headerLabel: "Verification",
      skeleton: { type: "badge", width: "w-16" },
    },
    minSize: 130,
    size: 150,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => (
      <MembershipApprovalStatusBadge status={row.original.status} />
    ),
    enableResizing: true,
    header: "Status",
    id: "status",
    maxSize: 190,
    meta: {
      className: "w-[160px] min-w-[140px]",
      headerLabel: "Status",
      skeleton: { type: "badge", width: "w-20" },
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
      skeleton: { type: "text", width: "w-20" },
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
