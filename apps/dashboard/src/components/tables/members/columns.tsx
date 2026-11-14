"use client"

import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"
import { Badge } from "@halaalvest/ui/components/badge"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import type { ColumnDef } from "@tanstack/react-table"
import { BadgeCheck } from "lucide-react"
import { formatCurrency } from "@halaalvest/utils"
import { memo } from "react"
import {
  getMemberState,
  getOpeningStepLabel,
  memberStateToneClassNames,
} from "@/lib/members/member-status-words"
import { formatDayMonthYear } from "@/utils/format"
import { MemberDesktopActions } from "./member-row-actions"

export type Member = RouterOutputs["members"]["list"]["data"][number]

type MembersTableMeta = {
  canManageMembers: boolean
}

const MemberCell = memo(
  ({
    fullName,
    migrationCompleted,
    openingStepLabel,
    phoneNumber,
  }: {
    fullName: string
    migrationCompleted: boolean
    openingStepLabel: string
    phoneNumber?: string | null
  }) => (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate font-medium text-foreground">{fullName}</p>
        {migrationCompleted ? (
          <BadgeCheck
            aria-label={`${openingStepLabel} done`}
            className="size-4 shrink-0 text-emerald-700"
          />
        ) : null}
      </div>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {phoneNumber ?? "No phone"}
      </p>
    </div>
  )
)

MemberCell.displayName = "MemberCell"

/** One plain word for where the member stands (see `getMemberState`). */
export const MemberStateBadge = memo(({ member }: { member: Member }) => {
  const state = getMemberState(member.status, member.operationalReadiness)

  return (
    <Badge className={memberStateToneClassNames[state.tone]} variant="outline">
      {state.label}
    </Badge>
  )
})

MemberStateBadge.displayName = "MemberStateBadge"

export function getMemberMonthlyAmount(member: Member) {
  const amount = member.contributionPlans?.[0]?.amount

  return amount === undefined || amount === null ? null : Number(amount)
}

export const columns: ColumnDef<Member>[] = [
  {
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Select ${row.original.fullName}`}
        checked={row.getIsSelected()}
        onCheckedChange={(checked) => row.toggleSelected(checked)}
      />
    ),
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    id: "select",
    maxSize: 50,
    meta: {
      className:
        "w-[50px] min-w-[50px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20 justify-center",
      skeleton: { type: "checkbox" },
      sticky: true,
    },
    minSize: 50,
    size: 50,
  },
  {
    accessorKey: "memberNumber",
    cell: ({ row }) => (
      <span className="truncate font-medium text-foreground">
        {row.original.memberNumber}
      </span>
    ),
    enableResizing: true,
    header: "Member no.",
    id: "number",
    maxSize: 220,
    meta: {
      className:
        "w-[160px] min-w-[130px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Member no.",
      skeleton: { type: "text", width: "w-24" },
      sticky: true,
    },
    minSize: 130,
    size: 160,
  },
  {
    accessorKey: "fullName",
    cell: ({ row }) => (
      <MemberCell
        fullName={row.original.fullName}
        migrationCompleted={
          row.original.operationalReadiness?.migration.state === "applied"
        }
        openingStepLabel={getOpeningStepLabel(
          row.original.operationalReadiness?.migration.mode ??
            "historical_backfill"
        )}
        phoneNumber={row.original.phoneNumber}
      />
    ),
    enableResizing: true,
    header: "Name",
    id: "member",
    maxSize: 480,
    meta: {
      className: "w-[280px] min-w-[220px]",
      headerLabel: "Name",
      skeleton: { type: "avatar-text", width: "w-32" },
    },
    minSize: 220,
    size: 280,
  },
  {
    cell: ({ row }) => (
      <span className="truncate">
        {row.original.deductionSource?.name ?? "None"}
      </span>
    ),
    enableResizing: true,
    enableSorting: false,
    header: "Workplace",
    id: "workplace",
    maxSize: 320,
    meta: {
      className: "w-[200px] min-w-[150px]",
      headerLabel: "Workplace",
      skeleton: { type: "text", width: "w-28" },
    },
    minSize: 150,
    size: 200,
  },
  {
    cell: ({ row }) => {
      const amount = getMemberMonthlyAmount(row.original)

      return (
        <span className="tabular-nums">
          {amount === null ? "Not set" : formatCurrency(amount)}
        </span>
      )
    },
    enableResizing: true,
    enableSorting: false,
    header: "Monthly savings",
    id: "monthly",
    maxSize: 220,
    meta: {
      className: "w-[160px] min-w-[140px]",
      headerLabel: "Monthly savings",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 140,
    size: 160,
  },
  {
    accessorKey: "joinedAt",
    cell: ({ row }) => <span>{formatDayMonthYear(row.original.joinedAt)}</span>,
    enableResizing: true,
    header: "Joined",
    id: "joined",
    maxSize: 200,
    meta: {
      className: "w-[140px] min-w-[130px]",
      headerLabel: "Joined",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 130,
    size: 140,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => <MemberStateBadge member={row.original} />,
    enableResizing: true,
    header: "Status",
    id: "status",
    maxSize: 240,
    meta: {
      className: "w-[190px] min-w-[150px]",
      headerLabel: "Status",
      skeleton: { type: "badge" },
    },
    minSize: 150,
    size: 190,
  },
  {
    cell: ({ row, table }) => {
      const meta = table.options.meta as MembersTableMeta

      return (
        <MemberDesktopActions
          canManageMembers={meta.canManageMembers}
          member={row.original}
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
