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
import { useImportFilterParams } from "@/hooks/use-import-filter-params"
import {
  getDashboardImportBatchLabel,
  type DashboardImportKind,
} from "@/lib/import-csv"

const statusFilters = [
  { id: "draft", name: "Draft" },
  { id: "applied", name: "Applied" },
  { id: "failed", name: "Failed" },
] as const

export function ImportFilterDrawer({
  importKind,
  onOpenChange,
  open,
}: {
  importKind?: DashboardImportKind
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { filter, setFilter } = useImportFilterParams()
  const [status, setStatus] = useState(filter.status ?? "all")
  const batchLabel = importKind
    ? getDashboardImportBatchLabel(importKind)
    : "import"

  async function applyFilters() {
    await setFilter({ status: status === "all" ? null : status })
  }

  function clearFilters() {
    setStatus("all")
  }

  return (
    <MobileFilterDrawer
      description={`Filter ${batchLabel} import batches by review status.`}
      onApply={applyFilters}
      onClear={clearFilters}
      onOpenChange={onOpenChange}
      open={open}
      title="Filter import batches"
    >
      <MobileFilterGroup
        title="Batch status"
        summary={filterOptionSummary(status, statusFilters)}
      >
        <RadioGroup onValueChange={setStatus} value={status}>
          {[{ id: "all", name: "Any status" }, ...statusFilters].map(
            (option) => (
              <label
                className="flex min-h-11 items-center gap-3 border border-border px-3 py-2 text-xs"
                htmlFor={`import-filter-status-${option.id}`}
                key={option.id}
              >
                <RadioGroupItem
                  id={`import-filter-status-${option.id}`}
                  value={option.id}
                />
                <span>{option.name}</span>
              </label>
            )
          )}
        </RadioGroup>
      </MobileFilterGroup>
    </MobileFilterDrawer>
  )
}
