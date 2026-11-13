"use client"

import { TenantLink } from "@halaalvest/tenant-url/next"
import { Button, buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { Search } from "lucide-react"
import { useState } from "react"
import { MembershipApprovalsFilterDrawer } from "@/components/membership-approvals-filter-drawer"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { useMembershipApprovalsFilterParams } from "@/hooks/use-membership-approvals-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function MembershipApprovalsMobileToolbar({
  showLinkGenerator,
}: {
  showLinkGenerator: boolean
}) {
  const { filter, hasFilters, setFilter } = useMembershipApprovalsFilterParams()
  const { params, setParams } = useSortParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const hasActiveControls = hasFilters || Boolean(params.sort)

  function clearFilters() {
    void Promise.all([
      setFilter({ search: null, status: null }),
      setParams({ sort: null }),
    ])
  }

  return (
    <>
      <div
        className="space-y-3 md:hidden"
        data-membership-approvals-mobile-header
      >
        <form className="w-full" onSubmit={(event) => event.preventDefault()}>
          <InputGroup className="h-11">
            <InputGroupAddon align="inline-start">
              <Search aria-hidden="true" className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search membership requests"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              onChange={(event) =>
                setFilter({ search: event.target.value || null })
              }
              placeholder="Search by name or number"
              spellCheck="false"
              type="search"
              value={filter.search ?? ""}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Filter membership requests"
                className={
                  hasActiveControls
                    ? "size-9 text-foreground"
                    : "size-9 text-muted-foreground"
                }
                onClick={() => setFilterOpen(true)}
                size="icon-sm"
              >
                <MiddayFilterIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </form>

        <div className="flex min-h-11 items-center justify-between gap-2">
          <div>
            {hasActiveControls ? (
              <Button
                className="h-11"
                onClick={clearFilters}
                type="button"
                variant="outline"
              >
                Clear filters
              </Button>
            ) : null}
          </div>

          {showLinkGenerator ? (
            <TenantLink
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-11"
              )}
              href="/member-signup-links"
            >
              Joining links
            </TenantLink>
          ) : null}
        </div>
      </div>

      {filterOpen ? (
        <MembershipApprovalsFilterDrawer
          onOpenChange={setFilterOpen}
          open={filterOpen}
        />
      ) : null}

    </>
  )
}
