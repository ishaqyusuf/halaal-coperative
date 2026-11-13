"use client"

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@halaalvest/ui/components/item"
import { ChevronRight } from "lucide-react"
import { useMembershipApprovalParams } from "@/hooks/use-membership-approval-params"
import { formatDayMonthYear } from "@/utils/format"
import { MembershipApprovalStatusBadge, type MembershipApprovalRow } from "./columns"

// One tap on the row opens the review sheet; there is no second menu.
export function MembershipApprovalMobileItem({
  request,
}: {
  request: MembershipApprovalRow
}) {
  const { setParams } = useMembershipApprovalParams()

  return (
    <Item
      className="min-h-11 w-full gap-2 border-0 bg-transparent px-0 py-4 text-left hover:bg-muted/50"
      render={
        <button
          aria-label={`Review ${request.fullName}`}
          onClick={() => void setParams({ membershipRequestId: request.id })}
          type="button"
        />
      }
    >
      <ItemHeader>
        <ItemContent className="min-w-0">
          <ItemTitle className="max-w-full text-lg">
            <span className="truncate">{request.fullName}</span>
          </ItemTitle>
          <ItemDescription className="line-clamp-1 text-base">
            {request.memberNumber} · {formatDayMonthYear(request.createdAt)}
          </ItemDescription>
        </ItemContent>
        <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
      </ItemHeader>
      <dl className="flex basis-full items-center justify-between gap-3">
        <dt className="sr-only">Status</dt>
        <dd>
          <MembershipApprovalStatusBadge status={request.status} />
        </dd>
        <dt className="sr-only">Phone</dt>
        <dd className="truncate text-base text-muted-foreground">
          {request.phoneNumber ?? ""}
        </dd>
      </dl>
    </Item>
  )
}
