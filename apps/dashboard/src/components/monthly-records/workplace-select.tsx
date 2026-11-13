"use client"

import {
  NativeSelect,
  NativeSelectOption,
} from "@halaalvest/ui/components/native-select"
import { cn } from "@halaalvest/ui/lib/utils"
import { useId } from "react"
import type { WorkplaceOption } from "./workplace-options"

// A native select: large, familiar and easy to use on phones.
export function WorkplaceSelect({
  allLabel,
  className,
  onChange,
  options,
  value,
}: {
  allLabel?: string
  className?: string
  onChange: (value: string | null) => void
  options: WorkplaceOption[]
  value: string | null
}) {
  const id = useId()

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label className="font-medium" htmlFor={id}>
        Workplace
      </label>
      <NativeSelect
        className="w-full"
        id={id}
        onChange={(event) => onChange(event.target.value || null)}
        value={value ?? ""}
      >
        <NativeSelectOption value="">
          {allLabel ?? "Choose a workplace"}
        </NativeSelectOption>
        {options.map((option) => (
          <NativeSelectOption key={option.id} value={option.id}>
            {option.name} · {option.unpaidCount} to receive
          </NativeSelectOption>
        ))}
      </NativeSelect>
    </div>
  )
}
