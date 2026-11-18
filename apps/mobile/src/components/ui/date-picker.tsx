import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import {
  buildCalendarDays,
  compareDateOnly,
  type DateOnlyParts,
  parseDateOnly,
  shiftCalendarMonth,
  todayDateOnly,
} from "@/lib/date-only"
import { cn } from "@/lib/utils"
import * as Haptics from "expo-haptics"
import { useMemo, useState } from "react"
import { View } from "react-native"

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"]
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function monthKey(parts: DateOnlyParts) {
  return parts.year * 12 + (parts.month - 1)
}

/** Whole-month bounds for paging and the month/year grid. */
function isMonthOutside(
  parts: DateOnlyParts,
  minimumDate?: string,
  maximumDate?: string
) {
  const min = minimumDate ? parseDateOnly(minimumDate) : null
  const max = maximumDate ? parseDateOnly(maximumDate) : null
  if (min && monthKey(parts) < monthKey(min)) return true
  if (max && monthKey(parts) > monthKey(max)) return true
  return false
}

function isDayOutside(value: string, minimumDate?: string, maximumDate?: string) {
  if (minimumDate && compareDateOnly(value, minimumDate) < 0) return true
  if (maximumDate && compareDateOnly(value, maximumDate) > 0) return true
  return false
}

/**
 * The 02 calendar: month header with a month/year jump, Today, prev/next,
 * a 6×7 day grid; min/max dates disable days, months and paging.
 */
export function DatePicker({
  maximumDate,
  minimumDate,
  onChange,
  today = todayDateOnly(),
  value,
}: {
  maximumDate?: string
  minimumDate?: string
  onChange: (value: string) => void
  /** Injectable for deterministic screenshots and tests. */
  today?: string
  value?: string | null
}) {
  const initial = parseDateOnly(value ?? "") ?? parseDateOnly(today)
  const [visibleMonth, setVisibleMonth] = useState<DateOnlyParts>({
    day: 1,
    month: initial?.month ?? 1,
    year: initial?.year ?? 2026,
  })
  const [mode, setMode] = useState<"days" | "months">("days")
  const [yearCursor, setYearCursor] = useState(visibleMonth.year)
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])
  const previousMonth = shiftCalendarMonth(visibleMonth, -1)
  const nextMonth = shiftCalendarMonth(visibleMonth, 1)
  const canGoBack = !isMonthOutside(previousMonth, minimumDate, maximumDate)
  const canGoForward = !isMonthOutside(nextMonth, minimumDate, maximumDate)
  const todayDisabled = isDayOutside(today, minimumDate, maximumDate)

  const pick = (next: string) => {
    void Haptics.selectionAsync()
    onChange(next)
  }

  return (
    <View className="gap-[12px]">
      <View className="min-h-[44px] flex-row items-center gap-[8px]">
        <Pressable
          accessibilityHint="Switches between days and a month and year grid"
          accessibilityLabel={`${MONTH_NAMES[visibleMonth.month - 1]} ${visibleMonth.year}, change month or year`}
          accessibilityRole="button"
          className="min-h-[44px] flex-1 flex-row items-center gap-[6px] rounded-lg"
          noRipple
          onPress={() => {
            setYearCursor(visibleMonth.year)
            setMode((current) => (current === "days" ? "months" : "days"))
          }}
        >
          <Text
            adjustsFontSizeToFit
            className="shrink"
            minimumFontScale={0.82}
            numberOfLines={1}
            variant="section"
          >
            {MONTH_NAMES[visibleMonth.month - 1]} {visibleMonth.year}
          </Text>
          <Icon
            className="size-base text-primary"
            name={mode === "days" ? "ChevronDown" : "ChevronUp"}
          />
        </Pressable>
        <Pressable
          accessibilityLabel="Jump to today"
          accessibilityRole="button"
          className={cn(
            "min-h-[36px] items-center justify-center rounded-full bg-accent px-[16px]",
            todayDisabled && "opacity-40"
          )}
          disabled={todayDisabled}
          haptic
          onPress={() => {
            const parts = parseDateOnly(today)
            if (parts) setVisibleMonth({ ...parts, day: 1 })
            setMode("days")
            pick(today)
          }}
        >
          <Text className="text-accent-foreground" variant="label">
            Today
          </Text>
        </Pressable>
        {mode === "days" ? (
          <>
            <Pressable
              accessibilityLabel="Previous month"
              accessibilityRole="button"
              className={cn(
                "size-[44px] items-center justify-center rounded-full",
                !canGoBack && "opacity-30"
              )}
              disabled={!canGoBack}
              haptic
              onPress={() => setVisibleMonth(previousMonth)}
            >
              <Icon className="size-md text-primary" name="ChevronLeft" />
            </Pressable>
            <Pressable
              accessibilityLabel="Next month"
              accessibilityRole="button"
              className={cn(
                "size-[44px] items-center justify-center rounded-full",
                !canGoForward && "opacity-30"
              )}
              disabled={!canGoForward}
              haptic
              onPress={() => setVisibleMonth(nextMonth)}
            >
              <Icon className="size-md text-primary" name="ChevronRight" />
            </Pressable>
          </>
        ) : null}
      </View>

      {mode === "days" ? (
        <View className="gap-[4px]" role="grid">
          <View className="flex-row">
            {WEEKDAYS.map((weekday, index) => (
              <View className="flex-1 items-center py-[4px]" key={`${weekday}-${index}`}>
                <Text className="text-muted-foreground" variant="caption">
                  {weekday}
                </Text>
              </View>
            ))}
          </View>
          {Array.from({ length: 6 }, (_, week) => (
            <View className="flex-row" key={week}>
              {days.slice(week * 7, week * 7 + 7).map((day) => {
                const selected = value === day.value
                const isToday = today === day.value
                const disabled = isDayOutside(day.value, minimumDate, maximumDate)
                return (
                  <View className="flex-1 items-center" key={day.value}>
                    <Pressable
                      accessibilityLabel={`${day.day} ${MONTH_NAMES[day.month - 1]} ${day.year}${isToday ? ", today" : ""}`}
                      accessibilityRole="button"
                      accessibilityState={{ disabled, selected }}
                      className={cn(
                        "size-[44px] items-center justify-center rounded-full",
                        selected && "bg-primary",
                        !selected && isToday && "border-2 border-primary"
                      )}
                      disabled={disabled}
                      noRipple
                      onPress={() => {
                        if (!day.inCurrentMonth) {
                          setVisibleMonth({ ...day, day: 1 })
                        }
                        pick(day.value)
                      }}
                    >
                      <Text
                        className={cn(
                          "text-[18px]",
                          selected
                            ? "font-extrabold text-primary-foreground"
                            : isToday
                              ? "font-extrabold text-primary"
                              : "font-medium text-foreground",
                          (disabled || !day.inCurrentMonth) &&
                            !selected &&
                            "opacity-30"
                        )}
                        tabular
                      >
                        {day.day}
                      </Text>
                    </Pressable>
                  </View>
                )
              })}
            </View>
          ))}
        </View>
      ) : (
        <View className="gap-[12px]">
          <View className="flex-row items-center justify-between rounded-[14px] bg-surface-raised p-[4px]">
            <Pressable
              accessibilityLabel="Previous year"
              accessibilityRole="button"
              className={cn(
                "size-[44px] items-center justify-center rounded-full",
                isMonthOutside({ day: 1, month: 12, year: yearCursor - 1 }, minimumDate, maximumDate) &&
                  "opacity-30"
              )}
              disabled={isMonthOutside(
                { day: 1, month: 12, year: yearCursor - 1 },
                minimumDate,
                maximumDate
              )}
              haptic
              onPress={() => setYearCursor((year) => year - 1)}
            >
              <Icon className="size-md text-primary" name="ChevronLeft" />
            </Pressable>
            <Text
              className="text-foreground"
              tabular
              variant="title"
            >
              {yearCursor}
            </Text>
            <Pressable
              accessibilityLabel="Next year"
              accessibilityRole="button"
              className={cn(
                "size-[44px] items-center justify-center rounded-full",
                isMonthOutside({ day: 1, month: 1, year: yearCursor + 1 }, minimumDate, maximumDate) &&
                  "opacity-30"
              )}
              disabled={isMonthOutside(
                { day: 1, month: 1, year: yearCursor + 1 },
                minimumDate,
                maximumDate
              )}
              haptic
              onPress={() => setYearCursor((year) => year + 1)}
            >
              <Icon className="size-md text-primary" name="ChevronRight" />
            </Pressable>
          </View>
          <View className="flex-row flex-wrap">
            {MONTHS.map((label, index) => {
              const parts = { day: 1, month: index + 1, year: yearCursor }
              const disabled = isMonthOutside(parts, minimumDate, maximumDate)
              const current =
                visibleMonth.month === index + 1 && visibleMonth.year === yearCursor
              return (
                <View className="w-1/3 p-[4px]" key={label}>
                  <Pressable
                    accessibilityLabel={`${MONTH_NAMES[index]} ${yearCursor}`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled, selected: current }}
                    className={cn(
                      "min-h-[48px] items-center justify-center rounded-[14px]",
                      current ? "bg-primary" : "bg-surface-raised",
                      disabled && "opacity-30"
                    )}
                    disabled={disabled}
                    haptic
                    onPress={() => {
                      setVisibleMonth(parts)
                      setMode("days")
                    }}
                  >
                    <Text
                      className={current ? "text-primary-foreground" : "text-foreground"}
                      variant="label"
                    >
                      {label}
                    </Text>
                  </Pressable>
                </View>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}
