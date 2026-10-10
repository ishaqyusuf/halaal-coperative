"use client"

import {
  MobileFilterGroup,
  filterOptionSummary,
} from "@/components/search-filter/mobile-filter-group"

import { useSuspenseQuery } from "@tanstack/react-query"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import type { PageFilterData } from "@halaalvest/utils"
import { useState } from "react"
import { MobileFilterDrawer } from "@/components/search-filter/mobile-filter-drawer"
import { SearchFilterField } from "@/components/search-filter/search-filter-field"
import type { SearchFilterValue } from "@/components/search-filter/types"
import { useContributionsFilterParams } from "@/hooks/use-contributions-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { useTRPC } from "@/trpc/client"

const sortOptions = [
  { id: "postedAt,desc", name: "Posted date: latest" },
  { id: "postedAt,asc", name: "Posted date: earliest" },
  { id: "memberName,asc", name: "Member name" },
  { id: "amount,desc", name: "Highest savings" },
] as const

function asString(value: SearchFilterValue) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

function FilterField({
  filter,
  onChange,
  value,
}: {
  filter: PageFilterData
  onChange: (value: SearchFilterValue) => void
  value: SearchFilterValue
}) {
  return (
    <SearchFilterField
      filter={filter}
      onChange={onChange}
      onOptionSelect={() => undefined}
      value={value}
    />
  )
}

export function ContributionsFilterDrawer({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const trpc = useTRPC()
  const { data: filterList } = useSuspenseQuery(
    trpc.filters.contributions.queryOptions()
  )
  const { filters, setFilters } = useContributionsFilterParams()
  const { params, setParams } = useSortParams()
  const [channel, setChannel] = useState(filters.channel)
  const [dateRange, setDateRange] = useState(filters.dateRange)
  const [memberId, setMemberId] = useState(filters.memberId)
  const [sort, setSort] = useState(params.sort?.join(",") ?? sortOptions[0].id)
  const available = (value: string) =>
    filterList.find((filter) => filter.value === value)

  async function apply() {
    await Promise.all([
      setFilters({ channel, dateRange, memberId }),
      setParams({ sort: sort.split(",") }),
    ])
  }

  function clear() {
    setChannel(null)
    setDateRange(null)
    setMemberId(null)
    setSort(sortOptions[0].id)
  }

  const memberFilter = available("memberId")
  const dateFilter = available("dateRange")
  const channelFilter = available("channel")

  return (
    <MobileFilterDrawer
      description="Filter and sort posted contribution activity."
      onApply={apply}
      onClear={clear}
      onOpenChange={onOpenChange}
      open={open}
      title="Filter contributions"
    >
      <div className="space-y-0">
        {memberFilter ? (
          <FilterField
            filter={memberFilter}
            onChange={(value) => setMemberId(asString(value))}
            value={memberId}
          />
        ) : null}
        {dateFilter ? (
          <FilterField
            filter={dateFilter}
            onChange={(value) =>
              setDateRange(Array.isArray(value) ? value : null)
            }
            value={dateRange}
          />
        ) : null}
        {channelFilter ? (
          <FilterField
            filter={channelFilter}
            onChange={(value) => setChannel(asString(value))}
            value={channel}
          />
        ) : null}
        <MobileFilterGroup
          title="Sort by"
          summary={filterOptionSummary(sort, sortOptions)}
        >
          <RadioGroup
            className="divide-y divide-border border-y border-border"
            onValueChange={setSort}
            value={sort}
          >
            {sortOptions.map((option) => (
              <label
                className="flex min-h-11 items-center gap-3 px-1 py-2 text-sm"
                htmlFor={`contributions-sort-${option.id}`}
                key={option.id}
              >
                <RadioGroupItem
                  id={`contributions-sort-${option.id}`}
                  value={option.id}
                />
                {option.name}
              </label>
            ))}
          </RadioGroup>
        </MobileFilterGroup>
      </div>
    </MobileFilterDrawer>
  )
}
