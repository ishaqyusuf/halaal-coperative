"use client"

import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"
import type { TenantMigrationSetupMode } from "@halaalvest/db"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { memo, useCallback } from "react"
import { OpenMemberStatusSheet } from "@/components/open-member-sheet"
import {
  getMemberMigrationAction,
  getMemberMigrationStartHref,
} from "@/lib/members/member-migration-routing"

export type Member = RouterOutputs["members"]["list"]["data"][number]

type MembersTableMeta = {
  canManageMembers: boolean
  migrationSetupMode: TenantMigrationSetupMode
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
    memberType,
  }: {
    email?: string | null
    fullName: string
    memberType: string
  }) => (
    <div>
      <div className="flex min-w-0 items-center gap-2">
        <p className="truncate font-medium text-foreground">{fullName}</p>
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

const StatusBadge = memo(({ status }: { status: string }) => (
  <Badge
    className={
      status === "active"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-amber-200 bg-amber-50 text-amber-700"
    }
    variant="outline"
  >
    {displayEnum(status)}
  </Badge>
))

StatusBadge.displayName = "StatusBadge"

const KycBadge = memo(({ status }: { status: string }) => (
  <Badge
    className={
      status === "verified"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-amber-200 bg-amber-50 text-amber-700"
    }
    variant="outline"
  >
    {displayEnum(status)}
  </Badge>
))

KycBadge.displayName = "KycBadge"

const ActionsCell = memo(
  ({
    canManageMembers,
    member,
    migrationSetupMode,
  }: {
    canManageMembers: boolean
    member: Member
    migrationSetupMode: TenantMigrationSetupMode
  }) => {
    const router = useRouter()
    const migrationAction = getMemberMigrationAction({
      setupMode: migrationSetupMode,
      state: member.backfillStatus?.state ?? "not_started",
    })
    const goToMember = useCallback(() => {
      router.push(`/members/${member.id}`)
    }, [member.id, router])
    const goToMigration = useCallback(() => {
      router.push(getMemberMigrationStartHref(member.id, migrationSetupMode))
    }, [member.id, migrationSetupMode, router])

    return (
      <div className="flex w-full items-center justify-center gap-1">
        {migrationAction.kind === "status" ? (
          <Badge
            className="border-emerald-200 bg-emerald-50 text-emerald-700"
            variant="outline"
          >
            {migrationAction.label}
          </Badge>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={goToMigration}
          >
            {migrationAction.label}
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button className="h-8 w-8 p-0" variant="ghost" />}>
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open member actions</span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={goToMember}>View details</DropdownMenuItem>

            {canManageMembers ? (
              <>
                {member.status !== "active" ? (
                  <OpenMemberStatusSheet
                    label="Activate"
                    memberId={member.id}
                    status="active"
                  />
                ) : null}
                {member.status !== "suspended" ? (
                  <OpenMemberStatusSheet
                    label="Suspend"
                    memberId={member.id}
                    status="suspended"
                  />
                ) : null}
                {member.status !== "inactive" ? (
                  <OpenMemberStatusSheet
                    label="Mark inactive"
                    memberId={member.id}
                    status="inactive"
                  />
                ) : null}
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }
)

ActionsCell.displayName = "ActionsCell"

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
    accessorKey: "fullName",
    cell: ({ row }) => (
      <MemberCell
        email={row.original.user?.email}
        fullName={row.original.fullName}
        memberType={row.original.memberType}
      />
    ),
    enableResizing: true,
    header: "Member",
    id: "member",
    maxSize: 480,
    meta: {
      className:
        "w-[320px] min-w-[240px] bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-20",
      headerLabel: "Member",
      skeleton: { type: "avatar-text", width: "w-32" },
      sticky: true,
    },
    minSize: 240,
    size: 320,
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
      className: "w-[160px] min-w-[130px]",
      headerLabel: "# / Joined",
      skeleton: { type: "text", width: "w-24" },
    },
    minSize: 130,
    size: 160,
  },
  {
    accessorKey: "status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
        <ActionsCell
          canManageMembers={meta.canManageMembers}
          member={row.original}
          migrationSetupMode={meta.migrationSetupMode}
        />
      )
    },
    enableHiding: false,
    enableResizing: false,
    enableSorting: false,
    header: "Actions",
    id: "actions",
    maxSize: 160,
    meta: {
      className:
        "text-right sticky right-0 bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-[#0f0f0f] z-30 justify-center !border-l !border-border",
      headerLabel: "Actions",
      skeleton: { type: "icon" },
      sticky: true,
    },
    minSize: 150,
    size: 150,
  },
]
