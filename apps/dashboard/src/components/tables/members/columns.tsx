"use client"

import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"
import { Badge } from "@halaalvest/ui/components/badge"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import type { ColumnDef } from "@tanstack/react-table"
import { BadgeCheck } from "lucide-react"
import { memo } from "react"
import { MemberDesktopActions } from "./member-row-actions"

export type Member = RouterOutputs["members"]["list"]["data"][number]

type MembersTableMeta = {
  canManageMembers: boolean
}

function displayEnum(value: string) {
  return value.replaceAll("_", " ")
}

function toDateString(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10)
}

const MemberCell = memo(
  ({
    email,
    fullName,
    migrationCompleted,
    migrationMode,
    memberType,
  }: {
    email?: string | null
    fullName: string
    migrationCompleted: boolean
    migrationMode: "brought_forward" | "historical_backfill"
    memberType: string
  }) => (
    <div>
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate font-medium text-foreground">{fullName}</p>
        {migrationCompleted ? (
          <BadgeCheck
            aria-label={
              migrationMode === "brought_forward"
                ? "Brought forward completed"
                : "Backfill completed"
            }
            className="size-4 shrink-0 text-emerald-600"
          />
        ) : null}
        <Badge className="shrink-0 capitalize" variant="outline">
          {displayEnum(memberType)}
        </Badge>
      </div>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {email ?? "No linked user"}
      </p>
    </div>
  )
)

MemberCell.displayName = "MemberCell"

const MemberNumberCell = memo(
  ({
    joinedAt,
    memberNumber,
  }: {
    joinedAt: Date | string
    memberNumber: string
  }) => (
    <div>
      <p className="truncate font-medium text-foreground">{memberNumber}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {toDateString(joinedAt)}
      </p>
    </div>
  )
)

MemberNumberCell.displayName = "MemberNumberCell"

export const MigrationSetupStatusBadge = memo(
  ({
    migrationMode,
    migrationState,
  }: {
    migrationMode: "brought_forward" | "historical_backfill"
    migrationState: "not_required" | "not_started" | "draft" | "applied"
  }) => {
    const label =
      migrationState === "applied"
        ? "Completed"
        : migrationState === "draft"
          ? "In progress"
          : migrationState === "not_required"
            ? "Not required"
            : "Action required"
    const migrationLabel =
      migrationMode === "brought_forward" ? "Brought forward" : "Backfill"

    return (
      <Badge
        aria-label={`${migrationLabel}: ${label}`}
        className={
          migrationState === "applied"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : migrationState === "not_required"
              ? "border-border bg-muted text-muted-foreground"
              : "border-amber-200 bg-amber-50 text-amber-700"
        }
        variant="outline"
      >
        {label}
      </Badge>
    )
  }
)

MigrationSetupStatusBadge.displayName = "MigrationSetupStatusBadge"

export const MemberStatusBadge = memo(({ status }: { status: string }) => (
  <Badge
    className={
      status === "active"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 capitalize"
        : status === "suspended"
          ? "border-red-200 bg-red-50 text-red-700 capitalize"
          : status === "pending"
            ? "border-amber-200 bg-amber-50 text-amber-700 capitalize"
            : "border-border bg-muted text-muted-foreground capitalize"
    }
    variant="outline"
  >
    {displayEnum(status)}
  </Badge>
))

MemberStatusBadge.displayName = "MemberStatusBadge"

export const KycBadge = memo(({ status }: { status: string }) => (
  <Badge
    className={
      status === "verified"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 capitalize"
        : "border-amber-200 bg-amber-50 text-amber-700 capitalize"
    }
    variant="outline"
  >
    {displayEnum(status)}
  </Badge>
))

KycBadge.displayName = "KycBadge"

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
      <MemberNumberCell
        joinedAt={row.original.joinedAt}
        memberNumber={row.original.memberNumber}
      />
    ),
    enableResizing: true,
    header: "# / Joined",
    id: "number",
    maxSize: 220,
    meta: {
      className:
        "w-[160px] min-w-[130px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "# / Joined",
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
        email={row.original.user?.email}
        fullName={row.original.fullName}
        migrationCompleted={
          row.original.operationalReadiness?.migration.state === "applied"
        }
        migrationMode={
          row.original.operationalReadiness?.migration.mode ??
          "historical_backfill"
        }
        memberType={row.original.memberType}
      />
    ),
    enableResizing: true,
    header: "Member",
    id: "member",
    maxSize: 480,
    meta: {
      className: "w-[320px] min-w-[240px]",
      headerLabel: "Member",
      skeleton: { type: "avatar-text", width: "w-32" },
    },
    minSize: 240,
    size: 320,
  },
  {
    cell: ({ row }) => (
      <MigrationSetupStatusBadge
        migrationMode={
          row.original.operationalReadiness?.migration.mode ??
          "historical_backfill"
        }
        migrationState={
          row.original.operationalReadiness?.migration.state ?? "not_started"
        }
      />
    ),
    enableResizing: true,
    enableSorting: false,
    header: "Migration setup status",
    id: "migrationSetupStatus",
    maxSize: 240,
    meta: {
      className: "w-[190px] min-w-[170px]",
      headerLabel: "Migration setup status",
      skeleton: { type: "badge" },
    },
    minSize: 170,
    size: 190,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => <MemberStatusBadge status={row.original.status} />,
    enableResizing: true,
    header: "Member status",
    id: "status",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "Member status",
      skeleton: { type: "badge" },
    },
    minSize: 120,
    size: 140,
  },
  {
    accessorKey: "kycStatus",
    cell: ({ row }) => <KycBadge status={row.original.kycStatus} />,
    enableResizing: true,
    header: "KYC",
    id: "kyc",
    maxSize: 180,
    meta: {
      className: "w-[140px] min-w-[120px]",
      headerLabel: "KYC",
      skeleton: { type: "badge" },
    },
    minSize: 120,
    size: 140,
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
