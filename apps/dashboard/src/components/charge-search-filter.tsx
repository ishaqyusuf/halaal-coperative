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
import { useIsMobile } from "@/hooks/use-mobile"
import { MobileSearchFilter } from "@/components/search-filter/mobile-search-filter"
import { FinanceFilterList } from "@/components/finance-filter-list"
import { SearchFilterDropdownInput } from "@/components/search-filter-dropdown-input"
import { useChargeFilterParams } from "@/hooks/use-charge-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

const statusFilters = [
  { id: "active", name: "Active" },
  { id: "inactive", name: "Inactive" },
]

const frequencyFilters = [
  { id: "recurring_monthly", name: "Recurring monthly" },
  { id: "per_contribution", name: "Per contribution" },
  { id: "one_time", name: "One time" },
  { id: "manual", name: "Manual" },
]

const valueTypeFilters = [
  { id: "fixed_amount", name: "Fixed amount" },
  { id: "percentage", name: "Percentage" },
]

export function ChargeSearchFilter() {
  const isMobile = useIsMobile()
  const inputRef = useRef<HTMLInputElement>(null)
  const { filter, hasFilters, setFilter } = useChargeFilterParams()
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

  const validFilters = {
    frequency: filter.frequency,
    status: filter.status,
    valueType: filter.valueType,
  }
  const hasValidFilters = Object.values(validFilters).some(
    (value) => value !== null
  )

  return (
    <DropdownMenu open={!isMobile && isOpen} onOpenChange={setIsOpen}>
      <div className="flex w-full flex-col items-start space-y-4 sm:w-auto sm:flex-row sm:items-center sm:space-y-0 sm:space-x-4">
        <form className="relative w-full sm:w-auto" onSubmit={handleSubmit}>
          <SearchFilterDropdownInput
            ref={inputRef}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            filterActive={hasValidFilters}
            filterOpen={isOpen}
            onFilterClick={isMobile ? () => setIsOpen(true) : undefined}
            onChange={handleSearch}
            placeholder="Search charges..."
            spellCheck="false"
            value={input}
          />
        </form>

        <FinanceFilterList
          filters={validFilters}
          onRemove={setFilter}
          options={{
            frequency: frequencyFilters,
            status: statusFilters,
            valueType: valueTypeFilters,
          }}
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
            {
              value: "frequency",
              label: "Frequency",
              type: "checkbox",
              options: frequencyFilters.map((item) => ({
                value: item.id,
                label: item.name,
              })),
            },
            {
              value: "valueType",
              label: "Value type",
              type: "checkbox",
              options: valueTypeFilters.map((item) => ({
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

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <span>Frequency</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                {frequencyFilters.map((item) => (
                  <DropdownMenuCheckboxItem
                    checked={filter.frequency === item.id}
                    key={item.id}
                    onCheckedChange={(checked) => {
                      setFilter({ frequency: checked ? item.id : null })
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
              <span>Value type</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                alignOffset={-4}
                className="p-0"
                sideOffset={14}
              >
                {valueTypeFilters.map((item) => (
                  <DropdownMenuCheckboxItem
                    checked={filter.valueType === item.id}
                    key={item.id}
                    onCheckedChange={(checked) => {
                      setFilter({ valueType: checked ? item.id : null })
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
              onClick={() =>
                void Promise.all([
                  setFilter({
                    frequency: null,
                    q: null,
                    status: null,
                    valueType: null,
                  }),
                  setSortParams({ sort: null }),
                ])
              }
            >
              Clear filters
            </DropdownMenuItem>
          </DropdownMenuGroup>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
