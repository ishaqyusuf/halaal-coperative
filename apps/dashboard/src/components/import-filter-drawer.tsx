"use client"

import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { useState } from "react"
import { MobileFilterDrawer } from "@/components/search-filter/mobile-filter-drawer"
import { useImportFilterParams } from "@/hooks/use-import-filter-params"

const statusFilters = [
  { id: "draft", name: "Draft" },
  { id: "applied", name: "Applied" },
  { id: "failed", name: "Failed" },
] as const

export function ImportFilterDrawer({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const { filter, setFilter } = useImportFilterParams()
  const [status, setStatus] = useState(filter.status ?? "all")

  function applyFilters() {
    void setFilter({ status: status === "all" ? null : status })
    onOpenChange(false)
  }

  function clearFilters() {
    setStatus("all")
    void setFilter({ q: null, status: null })
    onOpenChange(false)
  }

  return (
    <MobileFilterDrawer
      description="Filter staged member import batches by review status."
      onApply={applyFilters}
      onClear={clearFilters}
      onOpenChange={onOpenChange}
      open={open}
      title="Filter import batches"
    >
      <section className="space-y-3">
        <h3 className="text-xs font-medium text-foreground">Batch status</h3>
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
      </section>
    </MobileFilterDrawer>
  )
}
