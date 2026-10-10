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
import { useChargeFilterParams } from "@/hooks/use-charge-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

const statusOptions = [
  { id: "active", name: "Active" },
  { id: "inactive", name: "Inactive" },
]
const frequencyOptions = [
  { id: "recurring_monthly", name: "Recurring monthly" },
  { id: "per_contribution", name: "Per contribution" },
  { id: "one_time", name: "One time" },
  { id: "manual", name: "Manual" },
]
const valueTypeOptions = [
  { id: "fixed_amount", name: "Fixed amount" },
  { id: "percentage", name: "Percentage" },
]
const sortOptions = [
  { id: "name,asc", name: "Name A–Z" },
  { id: "name,desc", name: "Name Z–A" },
  { id: "amount,desc", name: "Highest amount" },
  { id: "currentEffectiveFrom,desc", name: "Newest effective date" },
]

function Options({
  idPrefix,
  onChange,
  options,
  value,
}: {
  idPrefix: string
  onChange: (value: string | null) => void
  options: Array<{ id: string; name: string }>
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
          className="flex min-h-11 items-center gap-3 px-1 py-2 text-xs"
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

export function ChargeLibraryFilterDrawer({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { filter, setFilter } = useChargeFilterParams()
  const { params, setParams } = useSortParams()
  const [status, setStatus] = useState(filter.status)
  const [frequency, setFrequency] = useState(filter.frequency)
  const [valueType, setValueType] = useState(filter.valueType)
  const [sort, setSort] = useState(params.sort?.join(",") ?? "name,asc")

  async function apply() {
    await Promise.all([
      setFilter({ frequency, status, valueType }),
      setParams({ sort: sort === "name,asc" ? null : sort.split(",") }),
    ])
  }
  function clear() {
    setFrequency(null)
    setStatus(null)
    setValueType(null)
    setSort("name,asc")
  }

  return (
    <MobileFilterDrawer
      description="Filter and sort cooperative charge definitions."
      onApply={apply}
      onClear={clear}
      onOpenChange={onOpenChange}
      open={open}
      title="Filter charges"
    >
      <div className="space-y-0">
        <MobileFilterGroup
          title="Status"
          summary={filterOptionSummary(status, statusOptions)}
        >
          <Options
            idPrefix="charge-status"
            onChange={setStatus}
            options={statusOptions}
            value={status}
          />
        </MobileFilterGroup>
        <MobileFilterGroup
          title="Frequency"
          summary={filterOptionSummary(frequency, frequencyOptions)}
        >
          <Options
            idPrefix="charge-frequency"
            onChange={setFrequency}
            options={frequencyOptions}
            value={frequency}
          />
        </MobileFilterGroup>
        <MobileFilterGroup
          title="Value type"
          summary={filterOptionSummary(valueType, valueTypeOptions)}
        >
          <Options
            idPrefix="charge-value"
            onChange={setValueType}
            options={valueTypeOptions}
            value={valueType}
          />
        </MobileFilterGroup>
        <MobileFilterGroup
          title="Sort by"
          summary={filterOptionSummary(sort, sortOptions)}
        >
          <Options
            idPrefix="charge-sort"
            onChange={(value) => setSort(value ?? "name,asc")}
            options={sortOptions}
            value={sort}
          />
        </MobileFilterGroup>
      </div>
    </MobileFilterDrawer>
  )
}
