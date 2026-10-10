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
import { useFoodPurchaseFilterParams } from "@/hooks/use-food-purchase-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

const statusOptions = [
  { id: "submitted", name: "Submitted" },
  { id: "under_review", name: "Under review" },
  { id: "approved", name: "Approved" },
  { id: "rejected", name: "Rejected" },
  { id: "cancelled", name: "Cancelled" },
] as const

const sortOptions = [
  { id: "requestedAt,desc", name: "Most recently requested" },
  { id: "requestedAt,asc", name: "Oldest requested first" },
  { id: "requestedAmount,desc", name: "Highest requested amount" },
  { id: "approvedAmount,desc", name: "Highest approved amount" },
] as const

function Options({
  idPrefix,
  onChange,
  options,
  value,
}: {
  idPrefix: string
  onChange: (value: string | null) => void
  options: ReadonlyArray<{ id: string; name: string }>
  value: string | null
}) {
  return (
    <RadioGroup
      className="divide-y divide-border border-y border-border"
      onValueChange={(next) => onChange(next === "all" ? null : next)}
      value={value ?? "all"}
    >
      {[{ id: "all", name: "Any" }, ...options].map((option) => (
        <label
          className="flex min-h-11 cursor-pointer items-center gap-3 px-1 py-2 text-sm"
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

export function FoodPurchaseFilterDrawer({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { filter, setFilter } = useFoodPurchaseFilterParams()
  const { params, setParams } = useSortParams()
  const [status, setStatus] = useState(filter.status)
  const [sort, setSort] = useState(params.sort?.join(",") ?? "requestedAt,desc")

  async function apply() {
    await Promise.all([
      setFilter({ status }),
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
      description="Filter and sort Foodstuff Purchase applications."
      onApply={apply}
      onClear={clear}
      onOpenChange={onOpenChange}
      open={open}
      title="Filter applications"
    >
      <div className="space-y-0">
        <MobileFilterGroup
          title="Status"
          summary={filterOptionSummary(status, statusOptions)}
        >
          <Options
            idPrefix="food-purchase-status"
            onChange={setStatus}
            options={statusOptions}
            value={status}
          />
        </MobileFilterGroup>
        <MobileFilterGroup
          title="Sort by"
          summary={filterOptionSummary(sort, sortOptions)}
        >
          <Options
            idPrefix="food-purchase-sort"
            onChange={(value) => setSort(value ?? "requestedAt,desc")}
            options={sortOptions}
            value={sort}
          />
        </MobileFilterGroup>
      </div>
    </MobileFilterDrawer>
  )
}
