"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useMembershipApprovalsFilterParams } from "@/hooks/use-membership-approvals-filter-params"

export function MembershipApprovalsEmptyState() {
  return (
    <div className="flex items-center justify-center">
      <div className="mt-32 max-w-md space-y-2 text-center">
        <h2 className="text-lg font-medium">No one has asked to join yet</h2>
        <p className="text-muted-foreground">
          People who join with your link will show here.
        </p>
      </div>
    </div>
  )
}

export function MembershipApprovalsNoResults() {
  const { setFilter } = useMembershipApprovalsFilterParams()

  return (
    <div className="flex items-center justify-center">
      <div className="mt-32 max-w-md space-y-5 text-center">
        <div className="space-y-2">
          <h2 className="text-lg font-medium">No matching requests</h2>
          <p className="text-muted-foreground">
            Try another name or clear the filter.
          </p>
        </div>
        <Button
          onClick={() => setFilter({ search: null, status: null })}
          variant="outline"
        >
          Clear filters
        </Button>
      </div>
    </div>
  )
}
