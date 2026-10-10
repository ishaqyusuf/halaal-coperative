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
import { paymentReceiptStatusFilters } from "@/components/payment-receipt-search-filter"
import { usePaymentReceiptFilterParams } from "@/hooks/use-payment-receipt-filter-params"
import { useSortParams } from "@/hooks/use-sort-params"

const sortOptions = [
  { id: "submittedAt,desc", name: "Recently submitted" },
  { id: "submittedAt,asc", name: "Oldest submitted first" },
  { id: "paidAt,desc", name: "Latest payment date" },
  { id: "totalAmount,desc", name: "Highest amount first" },
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

export function PaymentReceiptFilterDrawer({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { filter, setFilter } = usePaymentReceiptFilterParams()
  const { params, setParams } = useSortParams()
  const [status, setStatus] = useState(filter.status)
  const [sort, setSort] = useState(params.sort?.join(",") ?? "submittedAt,desc")

  async function apply() {
    await Promise.all([
      setFilter({ status }),
      setParams({ sort: sort === "submittedAt,desc" ? null : sort.split(",") }),
    ])
  }

  function clear() {
    setStatus(null)
    setSort("submittedAt,desc")
  }

  return (
    <MobileFilterDrawer
      description="Filter and sort submitted payment receipts."
      onApply={apply}
      onClear={clear}
      onOpenChange={onOpenChange}
      open={open}
      title="Filter payment receipts"
    >
      <div className="space-y-0">
        <MobileFilterGroup
          title="Status"
          summary={filterOptionSummary(status, paymentReceiptStatusFilters)}
        >
          <Options
            idPrefix="receipt-status"
            onChange={setStatus}
            options={paymentReceiptStatusFilters}
            value={status}
          />
        </MobileFilterGroup>
        <MobileFilterGroup
          title="Sort by"
          summary={filterOptionSummary(sort, sortOptions)}
        >
          <Options
            idPrefix="receipt-sort"
            onChange={(value) => setSort(value ?? "submittedAt,desc")}
            options={sortOptions}
            value={sort}
          />
        </MobileFilterGroup>
      </div>
    </MobileFilterDrawer>
  )
}
