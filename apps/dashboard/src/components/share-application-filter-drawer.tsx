"use client"

import {
  MobileFilterGroup,
  filterOptionSummary,
} from "@/components/search-filter/mobile-filter-group"

import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { useState } from "react"
import { MobileFilterDrawer } from "@/components/search-filter/mobile-filter-drawer"
import { useShareApplicationFilterParams } from "@/hooks/use-share-application-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

const shareApplicationStatusOptions = [
  { id: "pending", name: "Pending" },
  { id: "approved", name: "Approved" },
  { id: "rejected", name: "Rejected" },
  { id: "cancelled", name: "Cancelled" },
] as const

const shareApplicationSortOptions = [
  { id: "requestedAt,desc", name: "Newest requests" },
  { id: "requestedAt,asc", name: "Oldest requests" },
  { id: "requestedUnits,desc", name: "Most units requested" },
  { id: "shareValueSnapshot,desc", name: "Highest value" },
] as const

function Options<T extends string>({
  idPrefix,
  onChange,
  options,
  value,
}: {
  idPrefix: string
  onChange: (value: T | null) => void
  options: ReadonlyArray<{ id: T; name: string }>
  value: T | null
}) {
  const displayedOptions: ReadonlyArray<{ id: T | "all"; name: string }> = [
    { id: "all", name: "Any" },
    ...options,
  ]

  return (
    <RadioGroup
      onValueChange={(next) => onChange(next === "all" ? null : (next as T))}
      value={value ?? "all"}
    >
      {displayedOptions.map((option) => (
        <label
          className="flex min-h-11 items-center gap-3 border border-border px-3 py-2 text-xs"
          htmlFor={`${idPrefix}-${option.id}`}
          key={option.id}
        >
          <RadioGroupItem id={`${idPrefix}-${option.id}`} value={option.id} />
          <span>{option.name}</span>
        </label>
      ))}
    </RadioGroup>
  )
}

export function ShareApplicationFilterDrawer({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { filter, setFilter } = useShareApplicationFilterParams()
  const { params, setParams } = useSortParams()
  const [status, setStatus] = useState(filter.shareApplicationStatus)
  const [sort, setSort] = useState(params.sort?.join(",") ?? "requestedAt,desc")

  async function apply() {
    await Promise.all([
      setFilter({ shareApplicationStatus: status }),
      setParams({
        sort: sort === "requestedAt,desc" ? null : sort.split(","),
      }),
    ])
  }

  function clear() {
    setStatus(null)
    setSort("requestedAt,desc")
  }

  return (
    <MobileFilterDrawer
      description="Filter and sort share requests."
      onApply={apply}
      onClear={clear}
      onOpenChange={onOpenChange}
      open={open}
      title="Filter share requests"
    >
      <div className="space-y-0">
        <MobileFilterGroup
          title="Status"
          summary={filterOptionSummary(
            status as
              | (typeof shareApplicationStatusOptions)[number]["id"]
              | null,
            shareApplicationStatusOptions
          )}
        >
          <Options
            idPrefix="share-application-status"
            onChange={setStatus}
            options={shareApplicationStatusOptions}
            value={
              status as
                | (typeof shareApplicationStatusOptions)[number]["id"]
                | null
            }
          />
        </MobileFilterGroup>
        <MobileFilterGroup
          title="Sort by"
          summary={filterOptionSummary(
            sort as (typeof shareApplicationSortOptions)[number]["id"],
            shareApplicationSortOptions
          )}
        >
          <Options
            idPrefix="share-application-sort"
            onChange={(value) => setSort(value ?? "requestedAt,desc")}
            options={shareApplicationSortOptions}
            value={sort as (typeof shareApplicationSortOptions)[number]["id"]}
          />
        </MobileFilterGroup>
      </div>
    </MobileFilterDrawer>
  )
}
