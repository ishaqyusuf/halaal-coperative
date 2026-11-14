"use client"

import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { useId } from "react"

/** A short list of choices, all visible, each a large tap target. */
export function RequestChoice<T extends string>({
  disabled = false,
  label,
  onChange,
  options,
  value,
}: {
  disabled?: boolean
  label: string
  onChange: (value: T) => void
  options: ReadonlyArray<{ label: string; value: T }>
  value: T
}) {
  const id = useId()

  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 text-base font-medium text-foreground">
        {label}
      </legend>
      <RadioGroup
        className="grid gap-2 sm:grid-cols-2"
        disabled={disabled}
        onValueChange={(next) => onChange(next as T)}
        value={value}
      >
        {options.map((option) => (
          <label
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-(--ui-radius-control) border border-input bg-background px-4 py-2 text-base has-[[data-checked]]:border-primary has-[[data-checked]]:ring-1 has-[[data-checked]]:ring-primary"
            htmlFor={`${id}-${option.value}`}
            key={option.value}
          >
            <RadioGroupItem id={`${id}-${option.value}`} value={option.value} />
            <span>{option.label}</span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  )
}
