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
import { useRepaymentsFilterParams } from "@/hooks/use-repayments-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"
import { useTRPC } from "@/trpc/client"

const scheduleSortOptions = [
  { id: "dueAt,asc", name: "Due date: earliest" },
  { id: "dueAt,desc", name: "Due date: latest" },
  { id: "memberName,asc", name: "Member name" },
] as const

const historySortOptions = [
  { id: "paidAt,desc", name: "Paid date: latest" },
  { id: "paidAt,asc", name: "Paid date: earliest" },
  { id: "amount,desc", name: "Highest amount" },
  { id: "memberName,asc", name: "Member name" },
] as const

function asString(value: SearchFilterValue) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

function asEnum<TValue extends string>(value: SearchFilterValue) {
  return asString(value) as TValue | null
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

function withOption(
  filter: PageFilterData | undefined,
  option: {
    label: string
    value: string
  }
) {
  if (!filter) return undefined
  if (filter.options?.some((candidate) => candidate.value === option.value)) {
    return filter
  }

  return { ...filter, options: [...(filter.options ?? []), option] }
}

function SortOptions({
  onChange,
  options,
  value,
}: {
  onChange: (value: string) => void
  options: ReadonlyArray<{ id: string; name: string }>
  value: string
}) {
  return (
    <MobileFilterGroup
      title="Sort by"
      summary={filterOptionSummary(value, options)}
    >
      <RadioGroup
        className="divide-y divide-border border-y border-border"
        onValueChange={onChange}
        value={value}
      >
        {options.map((option) => (
          <label
            className="flex min-h-11 cursor-pointer items-center gap-3 px-1 py-2 text-sm"
            htmlFor={`repayments-sort-${option.id}`}
            key={option.id}
          >
            <RadioGroupItem
              id={`repayments-sort-${option.id}`}
              value={option.id}
            />
            {option.name}
          </label>
        ))}
      </RadioGroup>
    </MobileFilterGroup>
  )
}

export function RepaymentsFilterDrawer({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const trpc = useTRPC()
  const { data: filterList } = useSuspenseQuery(
    trpc.filters.repayments.queryOptions()
  )
  const { filters, setFilters } = useRepaymentsFilterParams()
  const { params, setParams } = useSortParams()
  const view = filters.view ?? "collections"
  const [assignedToUserId, setAssignedToUserId] = useState(
    filters.assignedToUserId
  )
  const [dateRange, setDateRange] = useState(filters.dateRange)
  const [memberId, setMemberId] = useState(filters.memberId)
  const [repaymentStatus, setRepaymentStatus] = useState(
    filters.repaymentStatus
  )
  const [resolutionStatus, setResolutionStatus] = useState(
    filters.resolutionStatus
  )
  const [scheduleStatus, setScheduleStatus] = useState(filters.scheduleStatus)
  const [stage, setStage] = useState(filters.stage)
  const sortOptions =
    view === "history" ? historySortOptions : scheduleSortOptions
  const [sort, setSort] = useState(params.sort?.join(",") ?? sortOptions[0].id)

  const available = (value: string) =>
    filterList.find((filter) => filter.value === value)

  async function apply() {
    const isHistory = view === "history"
    const isCollections = view === "collections"

    await Promise.all([
      setFilters({
        assignedToUserId: isHistory ? null : assignedToUserId,
        dateRange,
        memberId,
        repaymentStatus: isHistory ? repaymentStatus : null,
        resolutionStatus: isCollections ? resolutionStatus : null,
        scheduleStatus: view === "schedule" ? scheduleStatus : null,
        stage: isCollections ? stage : null,
      }),
      setParams({ sort: sort === sortOptions[0].id ? null : sort.split(",") }),
    ])
  }

  function clear() {
    setAssignedToUserId(null)
    setDateRange(null)
    setMemberId(null)
    setRepaymentStatus(null)
    setResolutionStatus(null)
    setScheduleStatus(null)
    setStage(null)
    setSort(sortOptions[0].id)
  }

  const memberFilter = available("memberId")
  const dateFilter = available("dateRange")
  const assigneeFilter = available("assignedToUserId")
  const scheduleStatusFilter = withOption(available("scheduleStatus"), {
    label: "Waived",
    value: "waived",
  })
  const stageFilter = available("stage")
  const resolutionFilter = available("resolutionStatus")
  const repaymentStatusFilter: PageFilterData = available(
    "repaymentStatus"
  ) ?? {
    label: "Repayment status",
    options: [
      { label: "Pending", value: "pending" },
      { label: "Posted", value: "posted" },
      { label: "Reversed", value: "reversed" },
    ],
    type: "checkbox",
    value: "repaymentStatus",
  }

  return (
    <MobileFilterDrawer
      description="Filter and sort repayment servicing records."
      onApply={apply}
      onClear={clear}
      onOpenChange={onOpenChange}
      open={open}
      title={
        view === "history" ? "Filter repayment history" : "Filter repayments"
      }
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

        {view !== "history" ? (
          <>
            {view === "schedule" && scheduleStatusFilter ? (
              <FilterField
                filter={scheduleStatusFilter}
                onChange={(value) =>
                  setScheduleStatus(
                    asEnum<NonNullable<typeof filters.scheduleStatus>>(value)
                  )
                }
                value={scheduleStatus}
              />
            ) : null}
            {view === "collections" ? (
              <div className="space-y-0">
                {assigneeFilter ? (
                  <FilterField
                    filter={assigneeFilter}
                    onChange={(value) => setAssignedToUserId(asString(value))}
                    value={assignedToUserId}
                  />
                ) : null}
                {stageFilter ? (
                  <FilterField
                    filter={stageFilter}
                    onChange={(value) =>
                      setStage(asEnum<NonNullable<typeof filters.stage>>(value))
                    }
                    value={stage}
                  />
                ) : null}
                {resolutionFilter ? (
                  <FilterField
                    filter={resolutionFilter}
                    onChange={(value) =>
                      setResolutionStatus(
                        asEnum<NonNullable<typeof filters.resolutionStatus>>(
                          value
                        )
                      )
                    }
                    value={resolutionStatus}
                  />
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <FilterField
              filter={repaymentStatusFilter}
              onChange={(value) =>
                setRepaymentStatus(
                  asEnum<NonNullable<typeof filters.repaymentStatus>>(value)
                )
              }
              value={repaymentStatus}
            />
          </>
        )}
        <SortOptions onChange={setSort} options={sortOptions} value={sort} />
      </div>
    </MobileFilterDrawer>
  )
}
