"use client"

import { Button } from "@halaalvest/ui/components/button"
import { memo } from "react"
import { useMembershipApprovalParams } from "@/hooks/use-membership-approval-params"
import type { MembershipApprovalRow } from "./columns"

export const MembershipApprovalActionsMenu = memo(
  ({ request }: { request: MembershipApprovalRow }) => {
    const { setParams } = useMembershipApprovalParams()

    return (
      <Button
        aria-label={`Review ${request.fullName}`}
        onClick={() => void setParams({ membershipRequestId: request.id })}
        size="sm"
        variant="outline"
      >
        Review
      </Button>
    )
  }
)

MembershipApprovalActionsMenu.displayName = "MembershipApprovalActionsMenu"
