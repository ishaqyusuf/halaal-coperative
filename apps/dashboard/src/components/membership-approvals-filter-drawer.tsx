"use client"

import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { Separator } from "@halaalvest/ui/components/separator"
import { useState, type ReactNode } from "react"
import {
  membershipApprovalSortOptions,
  membershipApprovalStatusFilters,
} from "@/components/membership-approval-filter-options"
import { MobileFilterDrawer } from "@/components/search-filter/mobile-filter-drawer"
import { useMembershipApprovalsFilterParams } from "@/hooks/use-membership-approvals-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

function FilterSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-xs font-medium text-foreground">{title}</h3>
      {children}
    </section>
  )
}

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

  function applyFilters() {
    void Promise.all([
      setFilter({ status }),
      setParams({
        sort: sort === "submittedAt,desc" ? null : sort.split(","),
      }),
    ])
    onOpenChange(false)
  }

  function clearFilters() {
    setStatus(null)
    setSort("submittedAt,desc")
    void Promise.all([
      setFilter({ search: null, status: null }),
      setParams({ sort: null }),
    ])
    onOpenChange(false)
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
      <div className="space-y-6">
        <FilterSection title="Request status">
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
        </FilterSection>

        <Separator />

        <FilterSection title="Sort by">
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
        </FilterSection>
      </div>
    </MobileFilterDrawer>
  )
}
