"use client"

import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@halaalvest/ui/components/item"
import { CheckCircle2, MessageSquarePlus, MoreHorizontal, Pencil } from "lucide-react"
import { useState, type KeyboardEvent } from "react"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { useSupportCaseParams } from "@/hooks/use-support-case-params"
import {
  formatSupportDate,
  labelFromValue,
  type SupportCase,
  SupportStatusBadge,
} from "./columns"

export function SupportMobileItem({
  canReviewFinancialAdjustments,
  mode,
  supportCase,
}: {
  canReviewFinancialAdjustments: boolean
  mode: "member" | "staff"
  supportCase: SupportCase
}) {
  const { setParams } = useSupportCaseParams()
  const [actionsOpen, setActionsOpen] = useState(false)
  const latestMessage = supportCase.messages.at(-1)

  function openSheet(type: "adjustment-review" | "member-reply" | "reply" | "update") {
    setActionsOpen(false)
    void setParams({
      supportCaseId: supportCase.id,
      supportCaseSheetType: type,
    })
  }

  function openCase() {
    openSheet(mode === "member" ? "member-reply" : "update")
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return

    event.preventDefault()
    openCase()
  }

  return (
    <>
      <Item
        aria-label={`Open ${supportCase.subject}`}
        className="cursor-pointer gap-3 border-0 bg-transparent px-0 py-4 hover:bg-muted/50"
        onClick={openCase}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        <ItemHeader>
          <ItemContent className="min-w-0">
            <ItemTitle className="max-w-full text-sm">
              <span className="truncate">{supportCase.subject}</span>
            </ItemTitle>
            <ItemDescription className="line-clamp-1">
              {supportCase.member
                ? `${supportCase.member.fullName} · ${supportCase.member.memberNumber}`
                : "No member linked"}
            </ItemDescription>
          </ItemContent>

          <ItemActions
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Button
              aria-label={`Open actions for ${supportCase.subject}`}
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

        <ItemContent className="min-w-0 basis-full">
          <div className="flex flex-wrap items-center gap-2">
            <SupportStatusBadge status={supportCase.status} />
            <Badge className="capitalize" variant="outline">
              {labelFromValue(supportCase.priority)} priority
            </Badge>
            <Badge className="capitalize" variant="secondary">
              {labelFromValue(supportCase.category)}
            </Badge>
          </div>
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
            <dt className="text-muted-foreground">Opened</dt>
            <dd className="truncate text-right">
              {formatSupportDate(supportCase.createdAt)}
            </dd>
            <dt className="text-muted-foreground">Assigned to</dt>
            <dd className="truncate text-right">
              {supportCase.assignedToUser?.fullName ?? "Unassigned"}
            </dd>
            <dt className="text-muted-foreground">Latest reply</dt>
            <dd className="line-clamp-2 text-right">
              {latestMessage?.message ?? "No replies yet"}
            </dd>
          </dl>
        </ItemContent>
      </Item>

      <MobileActionsDrawer
        description="Choose how to continue this support case."
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Support case actions"
      >
        <div className="space-y-2">
          {mode === "staff" ? (
            <Button
              className="h-11 w-full justify-start"
              onClick={() => openSheet("update")}
              type="button"
              variant="ghost"
            >
              <Pencil data-icon="inline-start" />
              Update case
            </Button>
          ) : null}
          {mode === "staff" && supportCase.status !== "closed" ? (
            <Button
              className="h-11 w-full justify-start"
              onClick={() => openSheet("reply")}
              type="button"
              variant="ghost"
            >
              <MessageSquarePlus data-icon="inline-start" />
              Add reply
            </Button>
          ) : null}
          {mode === "staff" &&
          supportCase.requiresFinancialAdjustment &&
          canReviewFinancialAdjustments ? (
            <Button
              className="h-11 w-full justify-start"
              onClick={() => openSheet("adjustment-review")}
              type="button"
              variant="ghost"
            >
              <CheckCircle2 data-icon="inline-start" />
              Review adjustment
            </Button>
          ) : null}
          {mode === "member" ? (
            <Button
              className="h-11 w-full justify-start"
              onClick={() => openSheet("member-reply")}
              type="button"
              variant="ghost"
            >
              <MessageSquarePlus data-icon="inline-start" />
              {supportCase.status === "closed"
                ? "View conversation"
                : "View and reply"}
            </Button>
          ) : null}
        </div>
      </MobileActionsDrawer>
    </>
  )
}
