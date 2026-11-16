"use client"

import dynamic from "next/dynamic"
import { type ComponentProps, useState } from "react"
import { useQaQuickFillInput } from "@/lib/qa-quick-fill-input"
import { Button } from "@halaalvest/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@halaalvest/ui/components/popover"
import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { cn } from "@halaalvest/ui/lib/utils"
import type { Matcher } from "react-day-picker"

const calendarSkeletonDays = Array.from({ length: 35 }, (_, index) => index)

// react-day-picker loads when the popover first opens, not with every form.
const Calendar = dynamic(
  () =>
    import("@halaalvest/ui/components/calendar").then(
      (module) => module.Calendar
    ),
  {
    loading: () => <CalendarSkeleton />,
  }
)

function CalendarSkeleton() {
  return (
    <div aria-label="Loading calendar" className="grid gap-2 p-1">
      <Skeleton className="h-8" />
      <div className="grid grid-cols-7 gap-1.5">
        {calendarSkeletonDays.map((day) => (
          <Skeleton className="size-8" key={day} />
        ))}
      </div>
    </div>
  )
}

function parseDateValue(value?: string | null) {
  if (!value) {
    return undefined
  }

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

function formatDateLabel(value?: string | null) {
  const date = parseDateValue(value)

  if (!date) {
    return "Pick a date"
  }

  // "14 Nov 2026", like formatDayMonthYear elsewhere on the dashboard. The
  // picker's Date is a local calendar day, so no time zone is forced here.
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function DatePickerInput({
  allowClear = true,
  className,
  defaultValue = "",
  disabled,
  id,
  max,
  min,
  name,
  onBlur,
  onChange,
  placeholder = "Pick a date",
  required,
  value,
  ...props
}: Omit<
  ComponentProps<typeof Button>,
  "children" | "name" | "onBlur" | "onChange" | "type" | "value"
> & {
  allowClear?: boolean
  defaultValue?: string
  max?: string
  min?: string
  name?: string
  onBlur?: () => void
  onChange?: (value: string) => void
  placeholder?: string
  required?: boolean
  value?: string
}) {
  const [open, setOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const currentValue = value ?? internalValue
  const selectedDate = parseDateValue(currentValue)
  const maxDate = parseDateValue(max)
  const minDate = parseDateValue(min)
  const disabledDays: Matcher[] = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ]

  function updateValue(nextValue: string) {
    if (value === undefined) {
      setInternalValue(nextValue)
    }

    onChange?.(nextValue)
    onBlur?.()
  }
  const quickFillRef = useQaQuickFillInput(updateValue)

  return (
    <div className="flex min-w-0 gap-2">
      {name ? (
        <input
          disabled={disabled}
          name={name}
          ref={quickFillRef}
          required={required}
          type="hidden"
          value={currentValue}
        />
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              {...props}
              className={cn(
                "min-w-0 flex-1 justify-start text-left font-normal",
                !currentValue && "text-muted-foreground",
                className
              )}
              disabled={disabled}
              id={id}
              aria-required={required}
              type="button"
              variant="outline"
            />
          }
        >
          {currentValue ? formatDateLabel(currentValue) : placeholder}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2">
          <Calendar
            captionLayout="dropdown"
            defaultMonth={selectedDate ?? minDate}
            disabled={disabledDays.length > 0 ? disabledDays : undefined}
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) {
                return
              }

              updateValue(formatDateValue(date))
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
      {allowClear && currentValue ? (
        <Button
          size="touch"
          className="shrink-0"
          disabled={disabled}
          onClick={() => updateValue("")}
          type="button"
          variant="ghost"
        >
          Clear
        </Button>
      ) : null}
    </div>
  )
}
