"use client"

import {
  MobileFilterGroup,
  filterOptionSummary,
} from "@/components/search-filter/mobile-filter-group"

import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { useState } from "react"
import {
  membershipApprovalSortOptions,
  membershipApprovalStatusFilters,
} from "@/components/membership-approval-filter-options"
import { MobileFilterDrawer } from "@/components/search-filter/mobile-filter-drawer"
import { useMembershipApprovalsFilterParams } from "@/hooks/use-membership-approvals-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function MembershipApprovalsFilterDrawer({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { filter, setFilter } = useMembershipApprovalsFilterParams()
  const { params, setParams } = useSortParams()
  const [status, setStatus] = useState(filter.status)
  const [sort, setSort] = useState(params.sort?.join(",") ?? "submittedAt,desc")

  async function applyFilters() {
    await Promise.all([
      setFilter({ status }),
      setParams({
        sort: sort === "submittedAt,desc" ? null : sort.split(","),
      }),
    ])
  }

  function clearFilters() {
    setStatus(null)
    setSort("submittedAt,desc")
  }

  return (
    <MobileFilterDrawer
      description="Filter and sort the membership approval queue."
      onApply={applyFilters}
      onClear={clearFilters}
      onOpenChange={onOpenChange}
      open={open}
      title="Filter membership approvals"
    >
      <div className="space-y-0">
        <MobileFilterGroup
          title="Request status"
          summary={filterOptionSummary(
            status ?? "all",
            membershipApprovalStatusFilters
          )}
        >
          <RadioGroup
            onValueChange={(value) => setStatus(value === "all" ? null : value)}
            value={status ?? "all"}
          >
            {[
              { id: "all", name: "Any status" },
              ...membershipApprovalStatusFilters,
            ].map((option) => (
              <label
                className="flex min-h-11 items-center gap-3 border border-border px-3 py-2 text-xs"
                htmlFor={`membership-approval-status-${option.id}`}
                key={option.id}
              >
                <RadioGroupItem
                  id={`membership-approval-status-${option.id}`}
                  value={option.id}
                />
                <span>{option.name}</span>
              </label>
            ))}
          </RadioGroup>
        </MobileFilterGroup>

        <MobileFilterGroup
          title="Sort by"
          summary={filterOptionSummary(sort, membershipApprovalSortOptions)}
        >
          <RadioGroup onValueChange={setSort} value={sort}>
            {membershipApprovalSortOptions.map((option) => (
              <label
                className="flex min-h-11 items-center gap-3 border border-border px-3 py-2 text-xs"
                htmlFor={`membership-approval-sort-${option.id}`}
                key={option.id}
              >
                <RadioGroupItem
                  id={`membership-approval-sort-${option.id}`}
                  value={option.id}
                />
                <span>{option.name}</span>
              </label>
            ))}
          </RadioGroup>
        </MobileFilterGroup>
      </div>
    </MobileFilterDrawer>
  )
}
