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
import { useLoanFilterParams } from "@/hooks/use-loan-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

export const requestStatuses = [
  { id: "submitted", name: "Submitted" },
  { id: "under_review", name: "Under review" },
  { id: "approved", name: "Approved" },
  { id: "rejected", name: "Rejected" },
] as const

export const portfolioStatuses = [
  { id: "approved", name: "Approved" },
  { id: "disbursed", name: "Disbursed" },
  { id: "active", name: "Active" },
  { id: "defaulted", name: "Defaulted" },
  { id: "completed", name: "Completed" },
  { id: "written_off", name: "Written off" },
] as const

export const loanRequestSortOptions = [
  { id: "memberName,asc", name: "Member name" },
  { id: "requestedAt,desc", name: "Newest request" },
  { id: "requestedAt,asc", name: "Oldest request" },
  { id: "status,asc", name: "Status" },
] as const

export const loanPortfolioSortOptions = [
  { id: "memberName,asc", name: "Member name" },
  { id: "loanProductName,asc", name: "Loan product" },
  {
    id: "estimatedMonthlyServicing,desc",
    name: "Highest monthly service",
  },
  {
    id: "estimatedMonthlyServicing,asc",
    name: "Lowest monthly service",
  },
  { id: "status,asc", name: "Status" },
] as const

export function getLoanSortOptions(activeView: "portfolio" | "requests") {
  return activeView === "requests"
    ? loanRequestSortOptions
    : loanPortfolioSortOptions
}

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

export function LoansFilterDrawer({
  activeView,
  onOpenChange,
  open,
}: {
  activeView: "portfolio" | "requests"
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { filter, setFilter } = useLoanFilterParams()
  const { params, setParams } = useSortParams()
  const [requestStatus, setRequestStatus] = useState(filter.requestStatus)
  const [portfolioStatus, setPortfolioStatus] = useState(filter.portfolioStatus)
  const [sort, setSort] = useState(params.sort?.join(",") ?? "memberName,asc")
  const sortOptions = getLoanSortOptions(activeView)

  async function apply() {
    await Promise.all([
      setFilter(
        activeView === "requests"
          ? { portfolioStatus: null, requestStatus }
          : { portfolioStatus, requestStatus: null }
      ),
      setParams({ sort: sort === "memberName,asc" ? null : sort.split(",") }),
    ])
  }

  function clear() {
    setRequestStatus(null)
    setPortfolioStatus(null)
    setSort("memberName,asc")
  }

  return (
    <MobileFilterDrawer
      description={
        activeView === "requests"
          ? "Filter and sort the loan request queue."
          : "Filter and sort approved and active loans."
      }
      onApply={apply}
      onClear={clear}
      onOpenChange={onOpenChange}
      open={open}
      title={activeView === "requests" ? "Filter requests" : "Filter portfolio"}
    >
      <div className="space-y-0">
        {activeView === "requests" ? (
          <MobileFilterGroup
            title="Request status"
            summary={filterOptionSummary(requestStatus, requestStatuses)}
          >
            <Options
              idPrefix="loan-request-status"
              onChange={(value) =>
                setRequestStatus(value as typeof requestStatus)
              }
              options={requestStatuses}
              value={requestStatus}
            />
          </MobileFilterGroup>
        ) : (
          <MobileFilterGroup
            title="Portfolio status"
            summary={filterOptionSummary(portfolioStatus, portfolioStatuses)}
          >
            <Options
              idPrefix="loan-portfolio-status"
              onChange={(value) =>
                setPortfolioStatus(value as typeof portfolioStatus)
              }
              options={portfolioStatuses}
              value={portfolioStatus}
            />
          </MobileFilterGroup>
        )}
        <MobileFilterGroup
          title="Sort by"
          summary={filterOptionSummary(sort, sortOptions)}
        >
          <Options
            idPrefix="loan-sort"
            onChange={(value) => setSort(value ?? "memberName,asc")}
            options={sortOptions}
            value={sort}
          />
        </MobileFilterGroup>
      </div>
    </MobileFilterDrawer>
  )
}
