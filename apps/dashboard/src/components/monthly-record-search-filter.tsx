"use client"

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import type { ChangeEvent, FormEvent } from "react"
import { useState } from "react"
import { FinanceFilterList } from "@/components/finance-filter-list"
import { MobileSearchFilter } from "@/components/search-filter/mobile-search-filter"
import { SearchFilterDropdownInput } from "@/components/search-filter-dropdown-input"
import { useIsMobile } from "@/hooks/use-mobile"
import { useMonthlyRecordFilterParams } from "@/hooks/use-monthly-record-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

const statusFilters = [
  { id: "pending", name: "Staged" },
  { id: "applied", name: "Applied" },
  { id: "cancelled", name: "Cancelled" },
] as const

export function MonthlyRecordSearchFilter() {
  const isMobile = useIsMobile()
  const { filter, hasFilters, setFilter } = useMonthlyRecordFilterParams()
  const { params, setParams: setSortParams } = useSortParams()
  const [input, setInput] = useState(filter.q ?? "")
  const [isOpen, setIsOpen] = useState(false)

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value

    if (value) {
      setInput(value)
    } else {
      setFilter({ q: null })
      setInput("")
    }
  }

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault()
    setFilter({ q: input.length > 0 ? input : null })
  }

  return (
    <DropdownMenu open={!isMobile && isOpen} onOpenChange={setIsOpen}>
      <div className="flex w-full flex-col items-start space-y-4 sm:w-auto sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
        <form className="relative w-full sm:w-auto" onSubmit={handleSubmit}>
          <SearchFilterDropdownInput
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            filterActive={Boolean(filter.status)}
            filterOpen={isOpen}
            onChange={handleSearch}
            onFilterClick={isMobile ? () => setIsOpen(true) : undefined}
            placeholder="Search members..."
            spellCheck="false"
            value={input}
          />
        </form>

        <FinanceFilterList
          filters={{ status: filter.status }}
          onRemove={setFilter}
          options={{ status: [...statusFilters] }}
        />
      </div>

      {isMobile && isOpen ? (
        <MobileSearchFilter
          filterList={[
            {
              value: "status",
              label: "Status",
              type: "checkbox",
              options: statusFilters.map((item) => ({
                value: item.id,
                label: item.name,
              })),
            },
          ]}
          filters={filter}
          onClose={() => setIsOpen(false)}
          setFilters={setFilter}
        />
      ) : null}

      <DropdownMenuContent
        align="start"
        alignOffset={-11}
        className="w-[350px]"
        side="bottom"
        sideOffset={19}
      >
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span>Status</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                {statusFilters.map((item) => (
                  <DropdownMenuCheckboxItem
                    checked={filter.status === item.id}
                    key={item.id}
                    onCheckedChange={(checked) => {
                      setFilter({ status: checked ? item.id : null })
                    }}
                    onSelect={(event) => event.preventDefault()}
                  >
                    {item.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        {hasFilters || params.sort ? (
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() => {
                setInput("")
                void Promise.all([
                  setFilter({ q: null, status: null }),
                  setSortParams({ sort: null }),
                ])
              }}
            >
              Clear filters
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
