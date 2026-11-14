"use client"

import type { ProjectFinancingRequestStatus } from "@halaalvest/db"
import { getRequestStatusFilterOptions } from "@/lib/requests/request-status-words"

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
import { useProjectFinancingFilterParams } from "@/hooks/use-project-financing-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export const projectFinancingStatusOptions = getRequestStatusFilterOptions(
  "projectFinancing"
).map((option) => ({
  id: option.value as ProjectFinancingRequestStatus,
  name: option.label,
}))

const projectFinancingSortOptions = [
  { id: "requestedAt,desc", name: "Newest first" },
  { id: "requestedAt,asc", name: "Oldest first" },
  { id: "requestedAmount,desc", name: "Largest amount" },
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
      className="divide-y divide-border border-y border-border"
      onValueChange={(next) => onChange(next === "all" ? null : (next as T))}
      value={value ?? "all"}
    >
      {displayedOptions.map((option) => (
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

export function ProjectFinancingFilterDrawer({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { filter, setFilter } = useProjectFinancingFilterParams()
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
      description="Filter and sort project financing requests."
      onApply={apply}
      onClear={clear}
      onOpenChange={onOpenChange}
      open={open}
      title="Filter requests"
    >
      <div className="space-y-0">
        <MobileFilterGroup
          title="Status"
          summary={filterOptionSummary(status, projectFinancingStatusOptions)}
        >
          <Options
            idPrefix="project-financing-status"
            onChange={setStatus}
            options={projectFinancingStatusOptions}
            value={status}
          />
        </MobileFilterGroup>
        <MobileFilterGroup
          title="Sort by"
          summary={filterOptionSummary(sort, projectFinancingSortOptions)}
        >
          <Options
            idPrefix="project-financing-sort"
            onChange={(value) => setSort(value ?? "requestedAt,desc")}
            options={projectFinancingSortOptions}
            value={sort}
          />
        </MobileFilterGroup>
      </div>
    </MobileFilterDrawer>
  )
}
