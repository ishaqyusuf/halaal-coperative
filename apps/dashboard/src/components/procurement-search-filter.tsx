"use client"

import type { ChangeEvent, FormEvent } from "react"
import { useState } from "react"
import type { ProcurementRequestStatus } from "@halaalvest/db"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { FinanceFilterList } from "@/components/finance-filter-list"
import { SearchFilterDropdownInput } from "@/components/search-filter-dropdown-input"
import { useProcurementFilterParams } from "@/hooks/use-procurement-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

const statusFilters = [
  { id: "submitted", name: "Submitted" },
  { id: "under_review", name: "Under review" },
  { id: "approved", name: "Approved" },
  { id: "purchased", name: "Purchased" },
  { id: "active", name: "Active" },
  { id: "completed", name: "Completed" },
  { id: "rejected", name: "Rejected" },
  { id: "cancelled", name: "Cancelled" },
] satisfies Array<{ id: ProcurementRequestStatus; name: string }>

export function ProcurementSearchFilter() {
  const { filter, setFilter } = useProcurementFilterParams()
  const { setParams: setSortParams } = useSortParams()
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

  const validFilters = { status: filter.status }
  const hasValidFilters = Object.values(validFilters).some(
    (value) => value !== null
  )

  async function clearFilters() {
    await Promise.all([
      setFilter({ q: null, status: null }),
      setSortParams({ sort: null }),
    ])
    setInput("")
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex w-full flex-col items-start space-y-4 sm:w-auto sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
        <form className="relative w-full sm:w-auto" onSubmit={handleSubmit}>
          <SearchFilterDropdownInput
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            filterActive={hasValidFilters}
            filterOpen={isOpen}
            onChange={handleSearch}
            placeholder="Search procurement..."
            spellCheck="false"
            value={input}
          />
        </form>

        <FinanceFilterList
          filters={validFilters}
          onRemove={setFilter}
          options={{ status: statusFilters }}
        />
      </div>

      <DropdownMenuContent
        align="end"
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
                      setIsOpen(false)
                    }}
                  >
                    {item.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void clearFilters()}>
          Clear filters
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
