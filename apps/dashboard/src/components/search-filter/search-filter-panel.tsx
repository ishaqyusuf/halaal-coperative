"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@halaalvest/ui/components/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { cn } from "@halaalvest/ui/lib/utils"
import type { PageFilterData } from "@halaalvest/utils"
import { clearManagedFilters } from "@/lib/filters/utils"
import { useSearchFilterContext } from "@/hooks/use-search-filter"
import { MiddayFilterIcon } from "@/components/search-filter-dropdown-input"
import { ActiveFilterList } from "./active-filter-list"
import { SearchFilterField } from "./search-filter-field"
import { getSearchKeyFromSchema, isSearchKey } from "./search-filter-utils"
import type { SearchFilterValues } from "./types"

export function SearchFilterPanel({
  filterList,
  filters,
  placeholder,
}: {
  filterList: PageFilterData[]
  filters: SearchFilterValues
  placeholder: string
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { filterSchema, hasFilters, isOpen, optionSelected, setFilters, setIsOpen } =
    useSearchFilterContext()
  const searchKey = getSearchKeyFromSchema(filterSchema)
  const [prompt, setPrompt] = useState(searchKey ? String(filters[searchKey] ?? "") : "")
  const filterKeys = useMemo(() => Object.keys(filterSchema ?? {}), [filterSchema])

  useEffect(() => {
    if (!searchKey) {
      return
    }

    const timeout = window.setTimeout(() => {
      setPrompt(String(filters[searchKey] ?? ""))
    }, 0)

    return () => window.clearTimeout(timeout)
  }, [filters, searchKey])

  useEffect(() => {
    if (!searchKey) {
      return
    }

    const timeout = window.setTimeout(() => {
      setFilters(
        {
          [searchKey]: prompt.trim() ? prompt : null,
        },
        {
          shallow: false,
        },
      )
    }, 250)

    return () => window.clearTimeout(timeout)
  }, [prompt, searchKey, setFilters])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!panelRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    document.addEventListener("keydown", handleEscape)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [isOpen, setIsOpen])

  function clearAll() {
    setPrompt("")
    setFilters(clearManagedFilters<SearchFilterValues>(filterKeys), { shallow: false })
    setIsOpen(false)
  }

  return (
    <div className="relative flex w-full min-w-0 flex-col gap-3" ref={panelRef}>
      <div className="flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
        {searchKey ? (
          <InputGroup className="w-full lg:max-w-[420px]">
            <InputGroupAddon align="inline-start">
              <HugeiconsIcon icon={Search01Icon} size={16} />
            </InputGroupAddon>
            <InputGroupInput
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={placeholder}
              value={prompt}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                aria-label="Toggle filters"
                className={cn(
                  "text-muted-foreground",
                  (hasFilters || isOpen) && "text-foreground",
                )}
                onClick={() => setIsOpen((current) => !current)}
                size="icon-xs"
              >
                <MiddayFilterIcon />
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        ) : (
          <Button
            className={cn("w-fit", (hasFilters || isOpen) && "border border-border")}
            onClick={() => setIsOpen((current) => !current)}
            type="button"
            variant="outline"
          >
            <MiddayFilterIcon />
            Filters
          </Button>
        )}
        <ActiveFilterList
          filterList={filterList}
          filters={filters}
          onClearAll={clearAll}
          onRemove={(patch) => setFilters(patch, { shallow: false })}
        />
      </div>

      {isOpen ? (
        <div className="grid gap-4 rounded-lg border border-border/70 bg-background/96 p-4 shadow-sm lg:grid-cols-2">
          {filterList
            .filter((filter) => !isSearchKey(String(filter.value)))
            .map((filter) => (
              <SearchFilterField
                filter={filter}
                key={String(filter.value)}
                onChange={(value) =>
                  setFilters(
                    {
                      [String(filter.value)]: value,
                    },
                    {
                      shallow: false,
                    },
                  )
                }
                onOptionSelect={(value, label) =>
                  optionSelected(String(filter.value), { label, value })
                }
                value={filters[String(filter.value)]}
              />
            ))}
          <div className="flex items-end justify-end lg:col-span-2">
            <Button onClick={clearAll} type="button" variant="ghost">
              Reset filters
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
