"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useMembershipApprovalsFilterParams } from "@/hooks/use-membership-approvals-filter-params"

export function MembershipApprovalsEmptyState() {
  return (
    <div className="flex items-center justify-center">
      <div className="mt-32 max-w-md space-y-2 text-center">
        <h2 className="text-lg font-medium">No membership requests yet</h2>
        <p className="text-sm text-muted-foreground">
          Verified member signup requests will appear here once applicants
          complete the onboarding link.
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
          <p className="text-sm text-muted-foreground">
            Try another search or clear the current status filter.
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
