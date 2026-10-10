"use client"

import { useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { Plus, Search } from "lucide-react"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { useShareApplicationFilterParams } from "@/hooks/use-share-application-filter-params"
import { useShareApplicationParams } from "@/hooks/use-share-application-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { ShareApplicationFilterDrawer } from "./share-application-filter-drawer"

export function ShareApplicationMobileToolbar({
  canCreate,
  createDisabled,
  createSheetType,
}: {
  canCreate: boolean
  createDisabled?: boolean
  createSheetType: "create" | "member-create"
}) {
  const { filter, setFilter } = useShareApplicationFilterParams()
  const { setParams: setShareApplicationParams } = useShareApplicationParams()
  const { params, setParams: setSortParams } = useSortParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const hasActiveControls = Boolean(
    filter.shareApplicationQ || filter.shareApplicationStatus || params.sort
  )

  return (
    <>
      <div className="space-y-3 md:hidden">
        <div className="flex items-center gap-2">
          <InputGroup className="h-11 min-w-0 flex-1">
            <InputGroupAddon align="inline-start">
              <Search aria-hidden className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search share requests"
              onChange={(event) =>
                void setFilter({
                  shareApplicationQ: event.target.value || null,
                })
              }
              placeholder="Search share requests..."
              type="search"
              value={filter.shareApplicationQ ?? ""}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Filter share requests"
                className="size-11"
                onClick={() => setFilterOpen(true)}
                size="icon-sm"
                type="button"
              >
                <MiddayFilterIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {canCreate ? (
            <Button
              aria-label="Submit share request"
              className="size-11"
              disabled={createDisabled}
              onClick={() =>
                void setShareApplicationParams({
                  shareApplicationId: null,
                  shareApplicationSheetType: createSheetType,
                })
              }
              size="icon-lg"
              type="button"
            >
              <Plus />
            </Button>
          ) : null}
        </div>
        {hasActiveControls ? (
          <Button
            className="h-11 px-0"
            onClick={() =>
              void Promise.all([
                setFilter({
                  shareApplicationQ: null,
                  shareApplicationStatus: null,
                }),
                setSortParams({ sort: null }),
              ])
            }
            type="button"
            variant="link"
          >
            Clear filters
          </Button>
        ) : null}
      </div>
      {filterOpen ? (
        <ShareApplicationFilterDrawer
          onOpenChange={setFilterOpen}
          open={filterOpen}
        />
      ) : null}
    </>
  )
}
