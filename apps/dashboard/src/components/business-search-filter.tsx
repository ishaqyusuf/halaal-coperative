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
import { useRef, useState } from "react"
import {
  businessHasProfitEntryFilters,
  businessProfitStatusFilters,
  businessSourceTypeFilters,
  businessStatusFilters,
} from "@/components/business-filter-options"
import { FinanceFilterList } from "@/components/finance-filter-list"
import { DateRangeFilter } from "@/components/search-filter/date-range-filter"
import { SearchFilterDropdownInput } from "@/components/search-filter-dropdown-input"
import { useBusinessFilterParams } from "@/hooks/use-business-filter-params"

export function BusinessSearchFilter() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { filter, hasFilters, setFilter } = useBusinessFilterParams()
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

  const validFilters = {
    dateRange: filter.dateRange,
    dividendPeriodId: filter.dividendPeriodId,
    hasProfitEntries:
      filter.hasProfitEntries === null ? null : String(filter.hasProfitEntries),
    profitStatus: filter.profitStatus,
    sourceType: filter.sourceType,
    status: filter.status,
  }
  const hasValidFilters = Object.values(validFilters).some(
    (value) => value !== null
  )

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex w-full flex-col items-start space-y-4 sm:w-auto sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
        <form className="relative w-full sm:w-auto" onSubmit={handleSubmit}>
          <SearchFilterDropdownInput
            ref={inputRef}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            filterActive={hasValidFilters}
            filterOpen={isOpen}
            onChange={handleSearch}
            placeholder="Search businesses..."
            spellCheck="false"
            value={input}
          />
        </form>

        <FinanceFilterList
          filters={validFilters}
          onRemove={setFilter}
          options={{
            hasProfitEntries: businessHasProfitEntryFilters,
            profitStatus: businessProfitStatusFilters,
            sourceType: businessSourceTypeFilters,
            status: businessStatusFilters,
          }}
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
              <span>Business status</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                {businessStatusFilters.map((item) => (
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

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span>Latest profit status</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                {businessProfitStatusFilters.map((item) => (
                  <DropdownMenuCheckboxItem
                    checked={filter.profitStatus === item.id}
                    key={item.id}
                    onCheckedChange={(checked) => {
                      setFilter({ profitStatus: checked ? item.id : null })
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

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span>Source type</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                {businessSourceTypeFilters.map((item) => (
                  <DropdownMenuCheckboxItem
                    checked={filter.sourceType === item.id}
                    key={item.id}
                    onCheckedChange={(checked) => {
                      setFilter({ sourceType: checked ? item.id : null })
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

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span>Profit entries</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                <DropdownMenuCheckboxItem
                  checked={filter.hasProfitEntries === true}
                  onCheckedChange={(checked) => {
                    setFilter({ hasProfitEntries: checked ? true : null })
                  }}
                  onSelect={(event) => event.preventDefault()}
                >
                  Has profit entries
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filter.hasProfitEntries === false}
                  onCheckedChange={(checked) => {
                    setFilter({ hasProfitEntries: checked ? false : null })
                  }}
                  onSelect={(event) => event.preventDefault()}
                >
                  No profit entries
                </DropdownMenuCheckboxItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span>Start date</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                <DateRangeFilter
                  onChange={(dateRange) => setFilter({ dateRange })}
                  value={filter.dateRange}
                />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        {hasFilters ? (
          <DropdownMenuGroup>
            <DropdownMenuItem
              onClick={() =>
                setFilter({
                  dateRange: null,
                  dividendPeriodId: null,
                  hasProfitEntries: null,
                  profitStatus: null,
                  q: null,
                  sourceType: null,
                  status: null,
                })
              }
              onSelect={() => setInput("")}
            >
              Clear filters
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
