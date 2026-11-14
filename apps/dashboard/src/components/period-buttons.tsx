"use client"

import { cn } from "@halaalvest/ui/lib/utils"

/**
 * A short row of period choices, all visible, each a 44px tap target.
 * Used by /reports and /analytics.
 */
export function PeriodButtons<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: T) => void
  options: ReadonlyArray<{ label: string; value: T }>
  value: T | null
}) {
  return (
    <div aria-label={label} className="flex flex-wrap gap-2" role="group">
      {options.map((option) => {
        const selected = option.value === value

        return (
          <button
            aria-pressed={selected}
            className={cn(
              "inline-flex min-h-11 items-center rounded-(--ui-radius-control) border px-4 text-base font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              selected
                ? "border-foreground bg-foreground text-background"
                : "border-input bg-background text-foreground hover:bg-muted"
            )}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
