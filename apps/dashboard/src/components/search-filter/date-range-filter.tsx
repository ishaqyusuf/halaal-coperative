"use client"

import dynamic from "next/dynamic"
import { CheckCircle2 } from "lucide-react"
import { cn } from "@halaalvest/ui/lib/utils"
import { Skeleton } from "@halaalvest/ui/components/skeleton"
import {
  createDatePresetSelection,
  dateFilterPresets,
  getDatePresetLabel,
  isDateFilterPreset,
  resolveDateFilter,
  type DateFilterValue,
} from "@halaalvest/utils"

const calendarSkeletonDays = Array.from({ length: 35 }, (_, index) => index)

const Calendar = dynamic(
  () =>
    import("@halaalvest/ui/components/calendar").then(
      (module) => module.Calendar
    ),
  {
    loading: () => <CalendarSkeleton />,
  }
)

export function DateRangeFilter({
  onChange,
  value,
}: {
  onChange: (value: string[] | null) => void
  value: DateFilterValue
}) {
  const values = Array.isArray(value) ? value : value ? [value] : []
  const selectedPreset =
    values.length === 1 && values[0] && isDateFilterPreset(values[0])
      ? values[0]
      : null
  const resolved = resolveDateFilter(value)

  return (
    <div className="flex max-w-[calc(100vw-2rem)] overflow-x-auto">
      <div className="w-40 shrink-0 border-r border-border py-1">
        {dateFilterPresets.map((preset) => {
          const selected = preset === selectedPreset

          return (
            <button
              className={cn(
                "flex h-8 w-full items-center gap-2 px-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                selected && "bg-accent font-medium text-accent-foreground"
              )}
              key={preset}
              onClick={() => onChange(createDatePresetSelection(preset))}
              type="button"
            >
              <CheckCircle2
                aria-hidden="true"
                className={cn(
                  "size-3 shrink-0",
                  selected ? "opacity-100" : "opacity-20"
                )}
              />
              <span className="whitespace-nowrap">
                {getDatePresetLabel(preset)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="min-w-max">
        <Calendar
          mode="range"
          onSelect={(range) => {
            if (!range) {
              onChange(null)
              return
            }

            onChange([
              range.from ? formatDateValue(range.from) : "-",
              range.to ? formatDateValue(range.to) : "-",
            ])
          }}
          selected={{
            from: resolved?.from ? parseDateValue(resolved.from) : undefined,
            to: resolved?.to ? parseDateValue(resolved.to) : undefined,
          }}
        />
      </div>
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div aria-label="Loading date filter" className="grid gap-2 p-3">
      <Skeleton className="h-8" />
      <div className="grid grid-cols-7 gap-1.5">
        {calendarSkeletonDays.map((day) => (
          <Skeleton className="size-8" key={day} />
        ))}
      </div>
    </div>
  )
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return undefined
  }

  return new Date(year, month - 1, day)
}

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}
