"use client"

import { useContext, useId } from "react"
import { DatePickerInput } from "@/components/date-picker-input"
import { Input } from "@halaalvest/ui/components/input"
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import type { PageFilterData } from "@halaalvest/utils"
import { DateRangeFilter } from "./date-range-filter"
import {
  MobileFilterGroup,
  MobileFilterGroupsContext,
} from "./mobile-filter-group"
import { getFilterValueLabel } from "./search-filter-utils"
import type { SearchFilterValue } from "./types"

export function SearchFilterField({
  filter,
  onChange,
  onOptionSelect,
  value,
  multiSelect = false,
}: {
  filter: PageFilterData
  onChange: (value: string | string[] | null) => void
  onOptionSelect: (value: string, label?: string) => void
  value: SearchFilterValue
  multiSelect?: boolean
}) {
  const mobile = useContext(MobileFilterGroupsContext) !== null
  const id = useId()
  const title = filter.label ?? String(filter.value)
  const filterValue = Array.isArray(value) ? value : (value ?? "")
  let control

  if (filter.type === "date-range") {
    control = (
      <DateRangeFilter mobile={mobile} onChange={onChange} value={value} />
    )
  } else if (filter.type === "date") {
    control = (
      <DatePickerInput
        aria-label={title}
        id={id}
        onChange={(date) => onChange(date || null)}
        placeholder="Select date"
        value={String(filterValue)}
      />
    )
  } else if (filter.type === "checkbox" && filter.options?.length) {
    if (mobile && multiSelect) {
      const values = Array.isArray(value) ? value : []
      control = (
        <div className="divide-y divide-border">
          {filter.options.map((option) => (
            <label
              className="flex min-h-11 items-center gap-3 py-2 text-sm"
              key={option.value}
            >
              <Checkbox
                checked={values.includes(option.value)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...values, option.value]
                    : values.filter((item) => item !== option.value)
                  onChange(next.length ? next : null)
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )
    } else if (mobile) {
      control = (
        <RadioGroup
          aria-label={title}
          onValueChange={(next) => onChange(next === "" ? null : next)}
          value={String(filterValue)}
        >
          {[{ label: "Any", value: "" }, ...filter.options].map((option) => (
            <label
              className="flex min-h-11 items-center gap-3 py-2 text-sm"
              key={option.value}
            >
              <RadioGroupItem value={option.value} />
              <span>{option.label}</span>
            </label>
          ))}
        </RadioGroup>
      )
    } else {
      control = (
        <NativeSelect
          aria-label={title}
          id={id}
          onChange={(event) => {
            const nextValue = event.target.value
            if (!nextValue) {
              onChange(null)
              return
            }
            onOptionSelect(
              nextValue,
              filter.options?.find((option) => option.value === nextValue)
                ?.label
            )
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
      )
    }
  } else {
    control = (
      <Input
        aria-label={title}
        className={mobile ? "h-11" : undefined}
        id={id}
        onChange={(event) => onChange(event.target.value || null)}
        placeholder={title}
        value={String(filterValue)}
      />
    )
  }

  return mobile ? (
    <MobileFilterGroup
      title={title}
      summary={getFilterValueLabel([filter], String(filter.value), value)}
    >
      {control}
    </MobileFilterGroup>
  ) : (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground" htmlFor={id}>
        {title}
      </label>
      {control}
    </div>
  )
}
