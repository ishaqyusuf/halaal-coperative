const FLOATING_SHEET_SIDE_INSET = 8
const CALENDAR_CONTENT_GUTTER = 20
const CALENDAR_MIN_SHEET_HEIGHT = 520
const CALENDAR_MAX_SHEET_HEIGHT = 560
const CALENDAR_SHEET_VERTICAL_CLEARANCE = 40
const CALENDAR_CHROME_HEIGHT = 218

type CalendarViewportInput = {
  fontScale: number
  height: number
  width: number
}

export type CalendarViewportLayout = {
  pageWidth: number
  sheetHeight: number
  stageHeight: number
}

export type CalendarSelectorGridLayout = {
  cellHeight: number
  cellWidth: number
  horizontalInset: number
  optionHeight: number
  optionWidth: number
  verticalInset: number
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

/**
 * Resolve calendar geometry in React Native logical pixels (dp), never raw
 * device pixels. The sheet stays fixed while moving between day, month, and
 * year modes, and the initial pager width matches the detached sheet gutters.
 */
export function resolveCalendarViewportLayout({
  fontScale,
  height,
  width,
}: CalendarViewportInput): CalendarViewportLayout {
  const safeWidth = Math.max(320, width)
  const safeHeight = Math.max(480, height)
  const maximumAvailableHeight = Math.max(
    440,
    safeHeight - CALENDAR_SHEET_VERTICAL_CLEARANCE
  )
  const fontScaleAllowance = clamp((fontScale - 1) * 40, 0, 20)
  const preferredHeight = Math.round(safeHeight * 0.68 + fontScaleAllowance)
  const sheetHeight = Math.min(
    maximumAvailableHeight,
    clamp(
      preferredHeight,
      CALENDAR_MIN_SHEET_HEIGHT,
      CALENDAR_MAX_SHEET_HEIGHT
    )
  )

  return {
    pageWidth: Math.max(
      264,
      Math.round(
        safeWidth -
          FLOATING_SHEET_SIDE_INSET * 2 -
          CALENDAR_CONTENT_GUTTER * 2
      )
    ),
    sheetHeight,
    stageHeight: Math.max(242, sheetHeight - CALENDAR_CHROME_HEIGHT),
  }
}

/**
 * Month and year selectors share this exact 3 x 4 grid. Deriving every cell
 * from the measured page width prevents uneven trailing space on narrow or
 * wide Android devices.
 */
export function resolveCalendarSelectorGridLayout(
  pageWidth: number,
  stageHeight: number
): CalendarSelectorGridLayout {
  const horizontalInset = pageWidth >= 344 ? 12 : 8
  const verticalInset = clamp(stageHeight * 0.07, 20, 24)
  const cellWidth = (pageWidth - horizontalInset * 2) / 3
  const cellHeight = (stageHeight - verticalInset * 2) / 4

  return {
    cellHeight,
    cellWidth,
    horizontalInset,
    optionHeight: clamp(cellHeight - 12, 48, 56),
    optionWidth: Math.max(72, cellWidth - 16),
    verticalInset,
  }
}
