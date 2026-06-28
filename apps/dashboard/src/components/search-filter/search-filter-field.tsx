"use client"

import { DatePickerInput } from "@/components/date-picker-input"
import { Input } from "@halaalvest/ui/components/input"
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import type { PageFilterData } from "@halaalvest/utils"
import type { SearchFilterValue } from "./types"

export function SearchFilterField({
  filter,
  onChange,
  onOptionSelect,
  value,
}: {
  filter: PageFilterData
  onChange: (value: string | string[] | null) => void
  onOptionSelect: (value: string, label?: string) => void
  value: SearchFilterValue
}) {
  const filterValue = Array.isArray(value) ? value : (value ?? "")

  if (filter.type === "date-range") {
    const [from = "", to = ""] = Array.isArray(value) ? value : []

    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {filter.label ?? filter.value}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <DatePickerInput
            onChange={(date) => {
              const next = [date, to].filter(Boolean)
              onChange(next.length ? next : null)
            }}
            placeholder="From date"
            value={from}
          />
          <DatePickerInput
            onChange={(date) => {
              const next = [from, date].filter(Boolean)
              onChange(next.length ? next : null)
            }}
            placeholder="To date"
            value={to}
          />
        </div>
      </div>
    )
  }

  if (filter.type === "date") {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {filter.label ?? filter.value}
        </p>
        <DatePickerInput
          onChange={(date) => onChange(date || null)}
          placeholder="Select date"
          value={String(filterValue)}
        />
      </div>
    )
  }

  if (filter.type === "checkbox" && filter.options?.length) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {filter.label ?? filter.value}
        </p>
        <NativeSelect
          onChange={(event) => {
            const nextValue = event.target.value
            if (!nextValue) {
              onChange(null)
              return
            }

            const label = filter.options?.find(
              (option) => option.value === nextValue
            )?.label
            onOptionSelect(nextValue, label)
          }}
          value={String(filterValue)}
        >
          <option value="">All</option>
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">
        {filter.label ?? filter.value}
      </p>
      <Input
        onChange={(event) => onChange(event.target.value || null)}
        placeholder={filter.label ?? String(filter.value)}
        value={String(filterValue)}
      />
    </div>
  )
}
