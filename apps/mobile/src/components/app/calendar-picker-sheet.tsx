import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import {
  buildCalendarDays,
  clampDateOnly,
  compareDateOnly,
  formatDateOnly,
  parseDateOnly,
  shiftCalendarMonth,
  todayDateOnly,
  type DateOnlyParts,
} from "@/lib/date-only"
import {
  resolveCalendarSelectorGridLayout,
  resolveCalendarViewportLayout,
} from "@/lib/calendar-layout"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { useCallback, useEffect, useRef, useState } from "react"
import { FlatList, View, useWindowDimensions } from "react-native"

type CalendarMode = "days" | "months" | "years"

const monthNames = [
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
const weekDays = ["S", "M", "T", "W", "T", "F", "S"]
const calendarPageOffsets = Array.from(
  { length: 121 },
  (_, index) => index - 60
)
const calendarInitialPage = 60

function fallbackDate(value: string) {
  return parseDateOnly(value) ?? parseDateOnly(todayDateOnly())!
}

export function CalendarPickerSheet({
  label,
  maximumDate,
  minimumDate,
  onChange,
  onClose,
  selectionMode = "date",
  testID,
  value,
  visible,
}: {
  label: string
  maximumDate?: string
  minimumDate?: string
  onChange: (value: string) => void
  onClose: () => void
  selectionMode?: "date" | "month"
  testID?: string
  value: string
  visible: boolean
}) {
  const { fontScale, height, width } = useWindowDimensions()
  const viewportLayout = resolveCalendarViewportLayout({
    fontScale,
    height,
    width,
  })
  const colors = useColors()
  const [mode, setMode] = useState<CalendarMode>(
    selectionMode === "month" ? "months" : "days"
  )
  const [draftDate, setDraftDate] = useState(() =>
    clampDateOnly(value || todayDateOnly(), minimumDate, maximumDate)
  )
  const [cursor, setCursor] = useState<DateOnlyParts>(() =>
    fallbackDate(draftDate)
  )
  const [yearPageStart, setYearPageStart] = useState(cursor.year - 5)
  const [calendarPageWidth, setCalendarPageWidth] = useState(
    viewportLayout.pageWidth
  )
  const [modeInteractionLocked, setModeInteractionLocked] = useState(false)
  const [activePageOffset, setActivePageOffset] = useState(0)
  const calendarPagerRef = useRef<FlatList<number>>(null)
  const activePageIndexRef = useRef(calendarInitialPage)
  const pagerDraggingRef = useRef(false)
  const dragReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const modeUnlockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!visible) return
    const nextDraft = clampDateOnly(
      value || todayDateOnly(),
      minimumDate,
      maximumDate
    )
    const nextCursor = fallbackDate(nextDraft)
    setDraftDate(nextDraft)
    setCursor(nextCursor)
    setYearPageStart(nextCursor.year - 5)
    setMode(selectionMode === "month" ? "months" : "days")
    setModeInteractionLocked(false)
    setActivePageOffset(0)
    activePageIndexRef.current = calendarInitialPage
    const frame = requestAnimationFrame(() => {
      calendarPagerRef.current?.scrollToIndex({
        animated: false,
        index: calendarInitialPage,
      })
    })

    return () => cancelAnimationFrame(frame)
  }, [maximumDate, minimumDate, selectionMode, value, visible])

  useEffect(
    () => () => {
      if (dragReleaseTimerRef.current) {
        clearTimeout(dragReleaseTimerRef.current)
      }
      if (modeUnlockTimerRef.current) {
        clearTimeout(modeUnlockTimerRef.current)
      }
    },
    []
  )

  // FloatingBottomSheet uses an 8pt side inset and this sheet uses 20pt
  // horizontal padding. Resolve the page width before the first paint so the
  // pager never mounts at 1px and then flashes blank while it realigns.
  const fixedSheetHeight = viewportLayout.sheetHeight
  const calendarStageHeight = viewportLayout.stageHeight
  const activePageTitle =
    mode === "days"
      ? (() => {
          const page = shiftCalendarMonth(cursor, activePageOffset)
          return `${monthNames[page.month - 1]} ${page.year}`
        })()
      : mode === "months"
        ? String(cursor.year + activePageOffset)
        : `${yearPageStart + activePageOffset * 12}–${yearPageStart + activePageOffset * 12 + 11}`

  const movePage = useCallback((amount: number, pageOffset = 0) => {
    const nextIndex = Math.max(
      0,
      Math.min(
        calendarPageOffsets.length - 1,
        calendarInitialPage + pageOffset + amount
      )
    )
    activePageIndexRef.current = nextIndex
    setActivePageOffset(nextIndex - calendarInitialPage)
    calendarPagerRef.current?.scrollToIndex({
      animated: true,
      index: nextIndex,
    })
  }, [])

  const handlePageDragStart = useCallback(() => {
    if (dragReleaseTimerRef.current) {
      clearTimeout(dragReleaseTimerRef.current)
    }
    pagerDraggingRef.current = true
  }, [])

  const handlePageDragEnd = useCallback(() => {
    if (dragReleaseTimerRef.current) {
      clearTimeout(dragReleaseTimerRef.current)
    }
    dragReleaseTimerRef.current = setTimeout(() => {
      pagerDraggingRef.current = false
      dragReleaseTimerRef.current = null
    }, 160)
  }, [])

  useEffect(() => {
    if (!visible || calendarPageWidth <= 1) return
    const frame = requestAnimationFrame(() => {
      calendarPagerRef.current?.scrollToOffset({
        animated: false,
        offset: calendarPageWidth * activePageIndexRef.current,
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [calendarPageWidth, visible])

  const beginModeTransition = () => {
    if (modeUnlockTimerRef.current) {
      clearTimeout(modeUnlockTimerRef.current)
    }
    setModeInteractionLocked(true)
    modeUnlockTimerRef.current = setTimeout(() => {
      setModeInteractionLocked(false)
      modeUnlockTimerRef.current = null
    }, 180)
  }

  const cycleMode = (pageOffset: number) => {
    if (pagerDraggingRef.current || modeInteractionLocked) return
    beginModeTransition()

    if (mode === "days") {
      const visibleMonth = shiftCalendarMonth(cursor, pageOffset)
      setCursor((current) => ({
        ...current,
        year: visibleMonth.year - pageOffset,
      }))
      setMode("months")
      return
    }

    if (mode === "months") {
      const pageYear = cursor.year + pageOffset
      setYearPageStart(pageYear - 5 - pageOffset * 12)
      setMode("years")
      return
    }

    const pageStart = yearPageStart + pageOffset * 12
    const selectedYear = fallbackDate(draftDate).year
    const nextYear =
      selectedYear >= pageStart && selectedYear <= pageStart + 11
        ? selectedYear
        : pageStart + 5
    if (selectionMode === "month") {
      setCursor((current) => ({ ...current, year: nextYear - pageOffset }))
      setMode("months")
      return
    }
    setCursor((current) =>
      shiftCalendarMonth({ ...current, day: 1, year: nextYear }, -pageOffset)
    )
    setMode("days")
  }

  const isDisabled = (date: string) =>
    Boolean(
      (minimumDate && compareDateOnly(date, minimumDate) < 0) ||
      (maximumDate && compareDateOnly(date, maximumDate) > 0)
    )

  const selectDay = (date: string) => {
    if (pagerDraggingRef.current || modeInteractionLocked || isDisabled(date))
      return
    setDraftDate(date)
  }

  const selectMonth = (month: number, year = cursor.year, pageOffset = 0) => {
    if (pagerDraggingRef.current || modeInteractionLocked) return
    if (selectionMode === "month") {
      const date = `${year}-${String(month).padStart(2, "0")}-01`
      if (!isDisabled(date)) setDraftDate(date)
      return
    }
    beginModeTransition()
    setCursor((current) =>
      shiftCalendarMonth({ ...current, day: 1, month, year }, -pageOffset)
    )
    setMode("days")
  }

  const selectYear = (year: number, pageOffset = 0) => {
    if (pagerDraggingRef.current || modeInteractionLocked) return
    beginModeTransition()
    setCursor((current) => ({
      ...current,
      day: 1,
      year: year - pageOffset,
    }))
    setMode("months")
  }

  const chooseToday = () => {
    const today = todayDateOnly()
    const nextDate = clampDateOnly(
      selectionMode === "month" ? `${today.slice(0, 7)}-01` : today,
      minimumDate,
      maximumDate
    )
    setDraftDate(nextDate)
    setCursor(fallbackDate(nextDate))
    setYearPageStart(fallbackDate(nextDate).year - 5)
    setMode(selectionMode === "month" ? "months" : "days")
    activePageIndexRef.current = calendarInitialPage
    setActivePageOffset(0)
    calendarPagerRef.current?.scrollToIndex({
      animated: true,
      index: calendarInitialPage,
    })
  }

  return (
    <FloatingBottomSheet
      accessibilityLabel={`${label} calendar`}
      enableContentPanningGesture={false}
      enableDynamicSizing={false}
      maxDynamicContentSize={fixedSheetHeight}
      onClose={onClose}
      presentation="large"
      scrollable={false}
      snapPoints={[fixedSheetHeight]}
      visible={visible}
    >
      <View className="px-5 pt-2 pb-5" testID={testID}>
        <Text
          accessibilityRole="header"
          className="text-2xl font-extrabold tracking-tight text-foreground"
        >
          {label}
        </Text>

        <View
          className="mt-4 w-full self-stretch overflow-hidden"
          onLayout={(event) => {
            const measuredWidth = Math.max(
              1,
              Math.round(event.nativeEvent.layout.width)
            )
            setCalendarPageWidth((currentWidth) =>
              Math.abs(currentWidth - measuredWidth) > 1
                ? measuredWidth
                : currentWidth
            )
          }}
          style={{ height: calendarStageHeight + 44 }}
        >
          <View className="h-12 flex-row items-center">
            <Button
              accessibilityLabel={`Previous ${mode === "days" ? "month" : mode === "months" ? "year" : "years"}`}
              disabled={modeInteractionLocked}
              onPress={() => movePage(-1, activePageOffset)}
              size="icon"
              variant="ghost"
            >
              <Icon className="size-base text-foreground" name="ChevronLeft" />
            </Button>
            <Button
              accessibilityHint={
                selectionMode === "month"
                  ? "Switches between months and years"
                  : "Switches between days, months, and years"
              }
              accessibilityLabel={`${activePageTitle}. Change calendar view`}
              className="min-w-0 flex-1"
              disabled={modeInteractionLocked}
              onPress={() => cycleMode(activePageOffset)}
              variant="ghost"
            >
              <Text className="text-sm font-extrabold text-foreground">
                {activePageTitle}
              </Text>
            </Button>
            <Button
              accessibilityLabel={`Next ${mode === "days" ? "month" : mode === "months" ? "year" : "years"}`}
              disabled={modeInteractionLocked}
              onPress={() => movePage(1, activePageOffset)}
              size="icon"
              variant="ghost"
            >
              <Icon className="size-base text-foreground" name="ChevronRight" />
            </Button>
          </View>
          <View
            className="overflow-hidden"
            style={{ height: calendarStageHeight }}
          >
            <FlatList
              ref={calendarPagerRef}
              data={calendarPageOffsets}
              decelerationRate="fast"
              directionalLockEnabled
              disableIntervalMomentum
              getItemLayout={(_, index) => ({
                index,
                length: calendarPageWidth,
                offset: calendarPageWidth * index,
              })}
              horizontal
              initialNumToRender={3}
              initialScrollIndex={calendarInitialPage}
              keyExtractor={(offset) => String(offset)}
              maxToRenderPerBatch={3}
              nestedScrollEnabled
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.max(
                  0,
                  Math.min(
                    calendarPageOffsets.length - 1,
                    Math.round(
                      event.nativeEvent.contentOffset.x / calendarPageWidth
                    )
                  )
                )
                activePageIndexRef.current = nextIndex
                setActivePageOffset(nextIndex - calendarInitialPage)
                handlePageDragEnd()
              }}
              onScrollBeginDrag={handlePageDragStart}
              onScrollEndDrag={handlePageDragEnd}
              onScrollToIndexFailed={({ index }) => {
                calendarPagerRef.current?.scrollToOffset({
                  animated: false,
                  offset: calendarPageWidth * index,
                })
              }}
              pagingEnabled
              removeClippedSubviews={false}
              renderItem={({ item: offset }) => (
                <CalendarPage
                  calendarStageHeight={calendarStageHeight}
                  cursor={cursor}
                  draftDate={draftDate}
                  interactionLocked={modeInteractionLocked}
                  isDisabled={isDisabled}
                  mode={mode}
                  offset={offset}
                  onSelectDay={selectDay}
                  onSelectMonth={selectMonth}
                  onSelectYear={selectYear}
                  pageWidth={calendarPageWidth}
                  selectedBackgroundColor={colors.brand}
                  yearPageStart={yearPageStart}
                />
              )}
              showsHorizontalScrollIndicator={false}
              snapToInterval={calendarPageWidth}
              style={{ width: calendarPageWidth }}
              windowSize={5}
            />
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between gap-2 border-t border-border pt-3">
          <Button
            accessibilityLabel={
              selectionMode === "month" ? "Choose this month" : "Choose today"
            }
            onPress={chooseToday}
            variant="ghost"
          >
            <Text className="text-brand font-bold">
              {selectionMode === "month" ? "This month" : "Today"}
            </Text>
          </Button>
          <View className="flex-row gap-2">
            <Button onPress={onClose} variant="secondary">
              <Text>Cancel</Text>
            </Button>
            <Button
              accessibilityLabel={`Use ${selectionMode === "month" ? `${monthNames[fallbackDate(draftDate).month - 1]} ${fallbackDate(draftDate).year}` : formatDateOnly(draftDate)}`}
              onPress={() => {
                onChange(draftDate)
                onClose()
              }}
            >
              <Text>
                {selectionMode === "month" ? "Use month" : "Use date"}
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </FloatingBottomSheet>
  )
}

function CalendarPage({
  calendarStageHeight,
  cursor,
  draftDate,
  interactionLocked,
  isDisabled,
  mode,
  offset,
  onSelectDay,
  onSelectMonth,
  onSelectYear,
  pageWidth,
  selectedBackgroundColor,
  yearPageStart,
}: {
  calendarStageHeight: number
  cursor: DateOnlyParts
  draftDate: string
  interactionLocked: boolean
  isDisabled: (date: string) => boolean
  mode: CalendarMode
  offset: number
  onSelectDay: (date: string) => void
  onSelectMonth: (month: number, year?: number, pageOffset?: number) => void
  onSelectYear: (year: number, pageOffset?: number) => void
  pageWidth: number
  selectedBackgroundColor: string
  yearPageStart: number
}) {
  if (mode === "days") {
    const month = shiftCalendarMonth(cursor, offset)
    const days = buildCalendarDays(month)

    return (
      <View
        pointerEvents={interactionLocked ? "none" : "auto"}
        style={{
          height: calendarStageHeight,
          overflow: "hidden",
          width: pageWidth,
        }}
      >
        <View className="flex-row">
          {weekDays.map((day, index) => (
            <View
              className="h-8 items-center justify-center"
              key={`${day}-${index}`}
              style={{ width: pageWidth / 7 }}
            >
              <Text className="text-xs font-bold text-muted-foreground">
                {day}
              </Text>
            </View>
          ))}
        </View>
        <View className="flex-row flex-wrap content-start">
          {days.map((day) => (
            <View
              className="h-11 items-center justify-center"
              key={day.value}
              style={{
                height: (calendarStageHeight - 32) / 6,
                width: pageWidth / 7,
              }}
            >
              <PressableDay
                date={day.value}
                disabled={isDisabled(day.value)}
                inCurrentMonth={day.inCurrentMonth}
                onPress={() => onSelectDay(day.value)}
                selected={day.value === draftDate}
                today={day.value === todayDateOnly()}
              >
                {day.day}
              </PressableDay>
            </View>
          ))}
        </View>
      </View>
    )
  }

  if (mode === "months") {
    const pageYear = cursor.year + offset
    const selectedDate = fallbackDate(draftDate)
    const grid = resolveCalendarSelectorGridLayout(
      pageWidth,
      calendarStageHeight
    )

    return (
      <View
        pointerEvents={interactionLocked ? "none" : "auto"}
        style={{
          height: calendarStageHeight,
          overflow: "hidden",
          width: pageWidth,
        }}
      >
        <View
          className="flex-row flex-wrap"
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            height: calendarStageHeight,
            paddingBottom: grid.verticalInset,
            paddingHorizontal: grid.horizontalInset,
            paddingTop: grid.verticalInset,
            width: pageWidth,
          }}
        >
          {monthNames.map((month, index) => {
            const selected =
              pageYear === selectedDate.year && index + 1 === selectedDate.month
            return (
              <View
                className="items-center justify-center"
                key={month}
                style={{
                  height: grid.cellHeight,
                  width: grid.cellWidth,
                }}
              >
                <View
                  className={cn(
                    "min-h-12 items-center justify-center rounded-2xl",
                    selected ? "bg-brand" : "bg-transparent"
                  )}
                  style={{
                    alignSelf: "center",
                    backgroundColor: selected
                      ? selectedBackgroundColor
                      : undefined,
                    borderRadius: 16,
                    height: grid.optionHeight,
                    width: grid.optionWidth,
                  }}
                >
                  <Button
                    accessibilityLabel={`${month} ${pageYear}`}
                    accessibilityState={{ selected }}
                    className="h-full w-full rounded-2xl bg-transparent px-0"
                    onPress={() => onSelectMonth(index + 1, pageYear, offset)}
                    variant="ghost"
                  >
                    <Text
                      className={cn(
                        "text-base font-extrabold",
                        selected ? "text-brand-foreground" : "text-foreground"
                      )}
                    >
                      {month.slice(0, 3)}
                    </Text>
                  </Button>
                </View>
              </View>
            )
          })}
        </View>
      </View>
    )
  }

  const pageStart = yearPageStart + offset * 12
  const selectedYear = fallbackDate(draftDate).year
  const grid = resolveCalendarSelectorGridLayout(pageWidth, calendarStageHeight)

  return (
    <View
      pointerEvents={interactionLocked ? "none" : "auto"}
      style={{
        height: calendarStageHeight,
        overflow: "hidden",
        width: pageWidth,
      }}
    >
      <View
        className="flex-row flex-wrap"
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          height: calendarStageHeight,
          paddingBottom: grid.verticalInset,
          paddingHorizontal: grid.horizontalInset,
          paddingTop: grid.verticalInset,
          width: pageWidth,
        }}
      >
        {Array.from({ length: 12 }, (_, index) => pageStart + index).map(
          (year) => {
            const selected = year === selectedYear
            return (
              <View
                className="items-center justify-center"
                key={year}
                style={{
                  height: grid.cellHeight,
                  width: grid.cellWidth,
                }}
              >
                <View
                  className={cn(
                    "min-h-12 items-center justify-center rounded-2xl",
                    selected ? "bg-brand" : "bg-transparent"
                  )}
                  style={{
                    alignSelf: "center",
                    backgroundColor: selected
                      ? selectedBackgroundColor
                      : undefined,
                    borderRadius: 16,
                    height: grid.optionHeight,
                    width: grid.optionWidth,
                  }}
                >
                  <Button
                    accessibilityLabel={String(year)}
                    accessibilityState={{ selected }}
                    className="h-full w-full rounded-2xl bg-transparent px-0"
                    onPress={() => onSelectYear(year, offset)}
                    variant="ghost"
                  >
                    <Text
                      className={cn(
                        "text-base font-extrabold",
                        selected ? "text-brand-foreground" : "text-foreground"
                      )}
                    >
                      {year}
                    </Text>
                  </Button>
                </View>
              </View>
            )
          }
        )}
      </View>
    </View>
  )
}

function PressableDay({
  children,
  date,
  disabled,
  inCurrentMonth,
  onPress,
  selected,
  today,
}: {
  children: number
  date: string
  disabled: boolean
  inCurrentMonth: boolean
  onPress: () => void
  selected: boolean
  today: boolean
}) {
  return (
    <Button
      accessibilityLabel={formatDateOnly(date)}
      accessibilityState={{ disabled, selected }}
      className={cn(
        "size-11 rounded-full p-0",
        selected && "bg-brand",
        today && !selected && "border-brand border",
        (!inCurrentMonth || disabled) && "opacity-35"
      )}
      disabled={disabled}
      onPress={onPress}
      size="icon"
      variant="ghost"
    >
      <Text
        className={cn(
          "text-sm font-bold",
          selected
            ? "text-brand-foreground"
            : today
              ? "text-brand"
              : "text-foreground"
        )}
      >
        {children}
      </Text>
    </Button>
  )
}
