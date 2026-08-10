"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { Search } from "lucide-react"
import { useState } from "react"
import { ImportFilterDrawer } from "@/components/import-filter-drawer"
import { OpenImportSheet } from "@/components/open-import-sheet"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { useImportFilterParams } from "@/hooks/use-import-filter-params"
import { useMobileViewport } from "@/hooks/use-mobile"
import type { DashboardImportKind } from "@/lib/import-csv"

export function ImportMobileToolbar({
  canManageImports,
  importKind,
  isLocked,
}: {
  canManageImports: boolean
  importKind?: DashboardImportKind
  isLocked: boolean
}) {
  const isMobile = useMobileViewport()

  if (isMobile === false) {
    return null
  }

  return (
    <ImportMobileToolbarContent
      canManageImports={canManageImports}
      importKind={importKind}
      isLocked={isLocked}
    />
  )
}

function ImportMobileToolbarContent({
  canManageImports,
  importKind,
  isLocked,
}: {
  canManageImports: boolean
  importKind?: DashboardImportKind
  isLocked: boolean
}) {
  const { filter, hasFilters, setFilter } = useImportFilterParams()
  const [filterOpen, setFilterOpen] = useState(false)

  function clearFilters() {
    void setFilter({ q: null, status: null })
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        <form className="w-full" onSubmit={(event) => event.preventDefault()}>
          <InputGroup className="h-11">
            <InputGroupAddon align="inline-start">
              <Search aria-hidden="true" className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              aria-label="Search import batches"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              onChange={(event) =>
                setFilter({ q: event.target.value || null })
              }
              placeholder="Search import batches..."
              spellCheck="false"
              type="search"
              value={filter.q ?? ""}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Filter import batches"
                className={
                  hasFilters
                    ? "size-11 text-foreground"
                    : "size-11 text-muted-foreground"
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
            {hasFilters ? (
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

          {importKind ? (
            <OpenImportSheet
              className="size-11"
              disabled={!canManageImports || isLocked}
              importKind={importKind}
            />
          ) : null}
        </div>
      </div>

      {filterOpen ? (
        <ImportFilterDrawer
          onOpenChange={setFilterOpen}
          open={filterOpen}
        />
      ) : null}
    </>
  )
}
