"use client"

import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
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
import { updateMemberStatusAction } from "@/lib/dashboard-actions"

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
  }: {
    email?: string | null
    fullName: string
  }) => (
    <div>
      <p className="truncate font-medium text-foreground">{fullName}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {email ?? "No linked user"}
      </p>
    </div>
  )
)

MemberCell.displayName = "MemberCell"

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
  }: {
    canManageMembers: boolean
    member: Member
  }) => {
    const router = useRouter()
    const isBackfilled = member.backfillStatus?.state === "applied"
    const hasDraft = member.backfillStatus?.state === "draft"
    const backfillLabel = isBackfilled
      ? "Backfilled"
      : hasDraft
        ? "Continue backfill"
        : "Backfill"
    const goToMember = useCallback(() => {
      router.push(`/members/${member.id}`)
    }, [member.id, router])
    const goToBackfill = useCallback(() => {
      router.push(`/members/${member.id}/backfill?step=baseline`)
    }, [member.id, router])

    return (
      <div className="flex w-full items-center justify-center gap-1">
        <Button
          disabled={isBackfilled}
          size="sm"
          type="button"
          variant="ghost"
          onClick={goToBackfill}
        >
          {backfillLabel}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button className="h-8 w-8 p-0" variant="ghost" />}>
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open member actions</span>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={goToMember}>View details</DropdownMenuItem>

            {canManageMembers ? (
              <form action={updateMemberStatusAction}>
                <input name="memberId" type="hidden" value={member.id} />
                {member.status !== "active" ? (
                  <button
                    className="flex w-full cursor-default items-center gap-2 px-2 py-2 text-left text-xs outline-hidden hover:bg-foreground/10"
                    name="status"
                    type="submit"
                    value="active"
                  >
                    Activate
                  </button>
                ) : null}
                {member.status !== "suspended" ? (
                  <button
                    className="flex w-full cursor-default items-center gap-2 px-2 py-2 text-left text-xs outline-hidden hover:bg-foreground/10"
                    name="status"
                    type="submit"
                    value="suspended"
                  >
                    Suspend
                  </button>
                ) : null}
                {member.status !== "inactive" ? (
                  <button
                    className="flex w-full cursor-default items-center gap-2 px-2 py-2 text-left text-xs outline-hidden hover:bg-foreground/10"
                    name="status"
                    type="submit"
                    value="inactive"
                  >
                    Mark inactive
                  </button>
                ) : null}
              </form>
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
    accessorKey: "fullName",
    cell: ({ row }) => (
      <MemberCell
        email={row.original.user?.email}
        fullName={row.original.fullName}
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
    cell: ({ row }) => row.original.memberNumber,
    enableResizing: true,
    header: "Number",
    id: "number",
    maxSize: 220,
    meta: {
      className: "w-[160px] min-w-[130px]",
      headerLabel: "Number",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 130,
    size: 160,
  },
  {
    accessorKey: "memberType",
    cell: ({ row }) => (
      <span className="capitalize">{displayEnum(row.original.memberType)}</span>
    ),
    enableResizing: true,
    header: "Type",
    id: "type",
    maxSize: 220,
    meta: {
      className: "w-[170px] min-w-[130px]",
      headerLabel: "Type",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 130,
    size: 170,
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
    accessorKey: "joinedAt",
    cell: ({ row }) => toDateString(row.original.joinedAt),
    enableResizing: true,
    header: "Joined",
    id: "joined",
    maxSize: 180,
    meta: {
      className: "w-[150px] min-w-[120px]",
      headerLabel: "Joined",
      skeleton: { type: "text", width: "w-20" },
    },
    minSize: 120,
    size: 150,
  },
  {
    cell: ({ row, table }) => {
      const meta = table.options.meta as MembersTableMeta

      return (
        <ActionsCell
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
