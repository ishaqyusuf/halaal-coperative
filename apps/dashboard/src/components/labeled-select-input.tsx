"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@halaalvest/ui/components/select"
import { cn } from "@halaalvest/ui/lib/utils"

export type LabeledSelectOption = {
  label: string
  value: string
}

const emptySelectValue = "__empty__"

export function LabeledSelectInput({
  disabled,
  name,
  onValueChange,
  options,
  placeholder,
  required,
  triggerClassName,
  value,
  defaultValue = "",
}: {
  defaultValue?: string
  disabled?: boolean
  name?: string
  onValueChange?: (value: string) => void
  options: LabeledSelectOption[]
  placeholder?: string
  required?: boolean
  triggerClassName?: string
  value?: string
}) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const currentValue = value ?? internalValue
  const selectValue = currentValue || emptySelectValue
  const hasEmptyOption = options.some((option) => option.value === "")
  const selectedOption = options.find((option) => option.value === currentValue)
  const selectedLabel = selectedOption?.label ?? placeholder

  function handleValueChange(nextSelectValue: string | null) {
    const nextValue =
      !nextSelectValue || nextSelectValue === emptySelectValue
        ? ""
        : nextSelectValue

    if (value === undefined) {
      setInternalValue(nextValue)
    }

    onValueChange?.(nextValue)
  }

  return (
    <>
      {name ? <input name={name} type="hidden" value={currentValue} /> : null}
      <Select
        disabled={disabled}
        required={required}
        value={selectValue}
        onValueChange={handleValueChange}
      >
        <SelectTrigger className={cn("w-full", triggerClassName)}>
          <span
            className={cn(
              "truncate",
              selectedLabel ? undefined : "text-muted-foreground",
            )}
          >
            {selectedLabel ?? placeholder}
          </span>
        </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {!hasEmptyOption && placeholder ? (
            <SelectItem disabled value={emptySelectValue}>
              {placeholder}
            </SelectItem>
          ) : null}
          {options.map((option) => (
            <SelectItem
              key={option.value || emptySelectValue}
                value={option.value || emptySelectValue}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </>
  )
}
