"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@halaalvest/ui/components/item"
import { BadgeCheck, MoreHorizontal } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, type KeyboardEvent } from "react"
import {
  KycBadge,
  MemberStatusBadge,
  MigrationSetupStatusBadge,
  type Member,
} from "./columns"
import { MemberMobileActionsDrawer } from "./member-row-actions"

function displayEnum(value: string) {
  return value.replaceAll("_", " ")
}

function toDateString(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10)
}

export function MemberMobileItem({
  canManageMembers,
  member,
  onSelectedChange,
  selected,
}: {
  canManageMembers: boolean
  member: Member
  onSelectedChange: (selected: boolean) => void
  selected: boolean
}) {
  const router = useRouter()
  const [actionsOpen, setActionsOpen] = useState(false)
  const migrationMode =
    member.operationalReadiness?.migration.mode ?? "historical_backfill"
  const migrationState =
    member.operationalReadiness?.migration.state ?? "not_started"
  const migrationCompleted = migrationState === "applied"

  function viewMember() {
    router.push(`/members/${member.id}`)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return

    event.preventDefault()
    viewMember()
  }

  return (
    <>
      <Item
        aria-label={`Open ${member.fullName}`}
        className="cursor-pointer gap-3 border-0 bg-transparent px-0 py-4 hover:bg-muted/50"
        onClick={viewMember}
        onKeyDown={handleKeyDown}
        role="link"
        tabIndex={0}
      >
        <ItemHeader>
          <div
            className="flex size-11 shrink-0 items-center justify-center"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Checkbox
              aria-label={`Select ${member.fullName}`}
              checked={selected}
              onCheckedChange={(checked) => onSelectedChange(checked === true)}
            />
          </div>

          <ItemContent className="min-w-0">
            <ItemTitle className="max-w-full text-sm">
              <span className="truncate">{member.fullName}</span>
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
            </ItemTitle>
            <ItemDescription className="line-clamp-1">
              {member.memberNumber} · {toDateString(member.joinedAt)}
            </ItemDescription>
            <Badge className="mt-1 w-fit capitalize" variant="outline">
              {displayEnum(member.memberType)}
            </Badge>
          </ItemContent>

          <ItemActions
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Button
              aria-label={`Open actions for ${member.fullName}`}
              className="size-11"
              onClick={() => setActionsOpen(true)}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </ItemActions>
        </ItemHeader>

        <ItemContent className="min-w-0 basis-full pl-14">
          <ItemDescription className="line-clamp-1">
            {member.user?.email ?? "No linked user"}
          </ItemDescription>
          <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
            <dt className="text-[11px] text-muted-foreground">
              Migration setup
            </dt>
            <dd className="flex justify-end">
              <MigrationSetupStatusBadge
                migrationMode={migrationMode}
                migrationState={migrationState}
              />
            </dd>

            <dt className="text-[11px] text-muted-foreground">Member status</dt>
            <dd className="flex justify-end">
              <MemberStatusBadge status={member.status} />
            </dd>

            <dt className="text-[11px] text-muted-foreground">KYC</dt>
            <dd className="flex justify-end">
              <KycBadge status={member.kycStatus} />
            </dd>
          </dl>
        </ItemContent>
      </Item>

      <MemberMobileActionsDrawer
        canManageMembers={canManageMembers}
        member={member}
        onOpenChange={setActionsOpen}
        open={actionsOpen}
      />
    </>
  )
}
