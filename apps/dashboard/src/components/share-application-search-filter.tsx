"use client"

import type { ChangeEvent, FormEvent, KeyboardEvent } from "react"
import { useState } from "react"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import { FinanceFilterList } from "@/components/finance-filter-list"
import { SearchFilterDropdownInput } from "@/components/search-filter-dropdown-input"
import { useShareApplicationFilterParams } from "@/hooks/use-share-application-filter-params"

const statusFilters: Array<{
  id: "approved" | "cancelled" | "pending" | "rejected"
  name: string
}> = [
  { id: "pending", name: "Pending" },
  { id: "approved", name: "Approved" },
  { id: "rejected", name: "Rejected" },
  { id: "cancelled", name: "Cancelled" },
]

export function ShareApplicationSearchFilter() {
  const { filter, setFilter } = useShareApplicationFilterParams()
  const currentQuery = filter.shareApplicationQ ?? ""
  const [draft, setDraft] = useState({
    source: currentQuery,
    value: currentQuery,
  })
  const [isOpen, setIsOpen] = useState(false)
  const input = draft.source === currentQuery ? draft.value : currentQuery

  const handleSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value

    if (value) {
      setDraft({ source: currentQuery, value })
    } else {
      setFilter({ shareApplicationQ: null })
      setDraft({ source: "", value: "" })
    }
  }

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault()
    const value = input.trim()
    setDraft({ source: value, value })
    setFilter({ shareApplicationQ: value.length > 0 ? value : null })
  }

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return

    event.preventDefault()
    const value = event.currentTarget.value.trim()
    setDraft({ source: value, value })
    setFilter({ shareApplicationQ: value.length > 0 ? value : null })
  }

  const validFilters = {
    shareApplicationStatus: filter.shareApplicationStatus,
  }
  const hasValidFilters = Object.values(validFilters).some(
    (value) => value !== null
  )

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
            onKeyDown={handleSearchKeyDown}
            placeholder="Search share applications..."
            spellCheck="false"
            value={input}
          />
        </form>

        <FinanceFilterList
          filters={validFilters}
          onRemove={setFilter}
          options={{ shareApplicationStatus: statusFilters }}
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
                    checked={filter.shareApplicationStatus === item.id}
                    key={item.id}
                    onCheckedChange={(checked) => {
                      setFilter({
                        shareApplicationStatus: checked ? item.id : null,
                      })
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
