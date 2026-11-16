"use client"

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
import { formatCurrency } from "@halaalvest/utils"
import { getOpeningStepLabel } from "@/lib/members/member-status-words"
import {
  getMemberMonthlyAmount,
  MemberStateBadge,
  type Member,
} from "./columns"
import { MemberMobileActionsDrawer } from "./member-row-actions"

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
  const monthlyAmount = getMemberMonthlyAmount(member)

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
                  aria-label={`${getOpeningStepLabel(migrationMode)} done`}
                  className="size-4 shrink-0 text-emerald-700"
                />
              ) : null}
            </ItemTitle>
            <ItemDescription className="line-clamp-1">
              {member.memberNumber}
              {member.deductionSource?.name
                ? ` · ${member.deductionSource.name}`
                : ""}
            </ItemDescription>
          </ItemContent>

          <ItemActions
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Button
              aria-label={`Open actions for ${member.fullName}`}
              onClick={() => setActionsOpen(true)}
              size="icon-touch"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </ItemActions>
        </ItemHeader>

        <ItemContent className="flex min-w-0 basis-full flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1 pl-14">
          <MemberStateBadge member={member} />
          {monthlyAmount === null ? null : (
            <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
              {formatCurrency(monthlyAmount)} a month
            </span>
          )}
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
