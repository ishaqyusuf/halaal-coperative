"use client"

import { useTenantRouter } from "@halaalvest/tenant-url/next"
import { Button } from "@halaalvest/ui/components/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@halaalvest/ui/components/item"
import { ClipboardCheck, MoreHorizontal } from "lucide-react"
import { useState, type KeyboardEvent } from "react"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import {
  MembershipApprovalStatusBadge,
  MembershipApprovalVerificationBadge,
  type MembershipApprovalRow,
} from "./columns"

function toDateString(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10)
}

export function MembershipApprovalMobileItem({
  request,
}: {
  request: MembershipApprovalRow
}) {
  const router = useTenantRouter()
  const [actionsOpen, setActionsOpen] = useState(false)

  function reviewRequest() {
    setActionsOpen(false)
    router.push(`/membership-approvals/${request.id}`)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return

    event.preventDefault()
    reviewRequest()
  }

  return (
    <>
      <Item
        aria-label={`Review ${request.fullName}`}
        className="cursor-pointer gap-3 border-0 bg-transparent px-0 py-4 hover:bg-muted/50"
        onClick={reviewRequest}
        onKeyDown={handleKeyDown}
        role="link"
        tabIndex={0}
      >
        <ItemHeader>
          <ItemContent className="min-w-0">
            <ItemTitle className="max-w-full text-sm">
              <span className="truncate">{request.fullName}</span>
            </ItemTitle>
            <ItemDescription className="line-clamp-1">
              {request.memberNumber} · {toDateString(request.createdAt)}
            </ItemDescription>
          </ItemContent>

          <ItemActions
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <Button
              aria-label={`Open actions for ${request.fullName}`}
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
          <ItemDescription className="line-clamp-1">
            {request.email}
          </ItemDescription>
          <dl className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2">
            <dt className="text-[11px] text-muted-foreground">Phone</dt>
            <dd className="text-right text-xs text-foreground">
              {request.phoneNumber ?? "No phone"}
            </dd>

            <dt className="text-[11px] text-muted-foreground">Verification</dt>
            <dd className="flex justify-end">
              <MembershipApprovalVerificationBadge
                verified={Boolean(request.emailVerifiedAt)}
              />
            </dd>

            <dt className="text-[11px] text-muted-foreground">
              Request status
            </dt>
            <dd className="flex justify-end">
              <MembershipApprovalStatusBadge status={request.status} />
            </dd>
          </dl>
        </ItemContent>
      </Item>

      <MobileActionsDrawer
        description={`Choose an action for ${request.fullName}.`}
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Membership request"
      >
        <Button
          className="h-11 w-full justify-start"
          onClick={reviewRequest}
          type="button"
          variant="ghost"
        >
          <ClipboardCheck data-icon="inline-start" />
          Review request
        </Button>
      </MobileActionsDrawer>
    </>
  )
}
