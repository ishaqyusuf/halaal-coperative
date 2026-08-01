"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { MoreHorizontal, Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { MembershipApprovalsFilterDrawer } from "@/components/membership-approvals-filter-drawer"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { useMembershipApprovalsFilterParams } from "@/hooks/use-membership-approvals-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export function MembershipApprovalsMobileToolbar({
  showLinkGenerator,
}: {
  showLinkGenerator: boolean
}) {
  const router = useRouter()
  const { filter, hasFilters, setFilter } = useMembershipApprovalsFilterParams()
  const { params, setParams } = useSortParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(false)
  const hasActiveControls = hasFilters || Boolean(params.sort)

  function clearFilters() {
    void Promise.all([
      setFilter({ search: null, status: null }),
      setParams({ sort: null }),
    ])
  }

  function openLinkGenerator() {
    setActionsOpen(false)
    router.push("/member-signup-links")
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
              placeholder="Search membership requests..."
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
            <Button
              aria-label="More membership approval actions"
              className="size-11"
              onClick={() => setActionsOpen(true)}
              size="icon-lg"
              type="button"
              variant="outline"
            >
              <MoreHorizontal />
            </Button>
          ) : null}
        </div>
      </div>

      {filterOpen ? (
        <MembershipApprovalsFilterDrawer
          onOpenChange={setFilterOpen}
          open={filterOpen}
        />
      ) : null}

      <MobileActionsDrawer
        description="Choose a membership approval action."
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Membership approval actions"
      >
        <Button
          className="h-11 w-full justify-start"
          onClick={openLinkGenerator}
          type="button"
          variant="ghost"
        >
          Open link generator
        </Button>
      </MobileActionsDrawer>
    </>
  )
}
