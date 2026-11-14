"use client"

import { Checkbox } from "@halaalvest/ui/components/checkbox"
import { useId } from "react"

/** A yes/no rule as one large tap row: the box and a plain sentence. */
export function SettingsToggle({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean
  disabled?: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  const id = useId()

  return (
    <label
      className="flex min-h-12 cursor-pointer items-center gap-3 rounded-(--ui-radius-control) border border-input bg-background px-4 py-3 text-base has-[[data-checked]]:border-primary"
      htmlFor={id}
    >
      <Checkbox
        checked={checked}
        disabled={disabled}
        id={id}
        onCheckedChange={(next) => onChange(next === true)}
      />
      <span>{label}</span>
    </label>
  )
}

/** "Yes" / "No" for a rule shown as a fact. */
export function yesNo(value: boolean) {
  return value ? "Yes" : "No"
}
