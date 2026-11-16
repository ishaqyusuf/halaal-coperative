import { expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { MissedMonthsRangeGrid } from "./missed-months-range-grid"
import {
  applyMissedMonthsRange,
  canApplyMissedMonthsRange,
  initialMissedMonths,
  initialMissedMonthsRange,
} from "./missed-months-range"

const rows = [
  { month: "2025-01", period: "January 2025", savingsContribution: 5000 },
  { month: "2025-02", period: "February 2025", savingsContribution: 5000 },
  {
    month: "2025-03",
    period: "March 2025",
    savingsContribution: 5000,
    status: "missed",
  },
  { month: "2025-04", period: "April 2025", savingsContribution: 5000 },
]

test("months with no record start unticked; only a saved Missed record is ticked", () => {
  expect([...initialMissedMonths(rows)]).toEqual(["2025-03"])
})

test("the range tool starts with no range and no status, so one click changes nothing", () => {
  expect(initialMissedMonthsRange).toEqual({
    action: "",
    fromMonth: "",
    toMonth: "",
  })
  expect(canApplyMissedMonthsRange(initialMissedMonthsRange)).toBe(false)
  const unchanged = applyMissedMonthsRange(
    rows,
    initialMissedMonths(rows),
    initialMissedMonthsRange
  )
  expect([...unchanged]).toEqual(["2025-03"])
  // A range without a status is still not enough.
  expect(
    canApplyMissedMonthsRange({
      action: "",
      fromMonth: "2025-01",
      toMonth: "2025-04",
    })
  ).toBe(false)
})

test("a chosen range marks months missed or back to no record", () => {
  const missed = applyMissedMonthsRange(rows, new Set(), {
    action: "missed",
    fromMonth: "2025-02",
    toMonth: "2025-01",
  })
  expect([...missed].sort()).toEqual(["2025-01", "2025-02"])
  const cleared = applyMissedMonthsRange(
    rows,
    new Set(["2025-02", "2025-03"]),
    {
      action: "no-record",
      fromMonth: "2025-03",
      toMonth: "2025-04",
    }
  )
  expect([...cleared]).toEqual(["2025-02"])
})

test("the grid renders no range, a Choose status and a disabled Set button", () => {
  const html = renderToStaticMarkup(
    <MissedMonthsRangeGrid disabled={false} rows={rows} />
  )
  expect(html).not.toContain('value="2025-01" type="month"')
  expect(
    html.match(/type="month"[^>]*value=""|value=""[^>]*type="month"/g)
  ).toHaveLength(2)
  expect(html).toContain("Choose")
  expect(html).not.toContain("Mark as committed")
  expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Set these months/)
  // Only March, the saved Missed month, shows as missed.
  expect(html.match(/>Missed</g)).toHaveLength(1)
})
