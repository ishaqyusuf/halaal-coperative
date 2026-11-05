import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { repaymentsFilterParamsSchema } from "@/hooks/use-repayments-filter-params"
import { overdueRepaymentScheduleHref } from "./repayments-drilldown"

function read(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8")
}

describe("overdue repayment drill-down", () => {
  test("only uses keys and values the repayments filter schema parses", () => {
    const url = new URL(overdueRepaymentScheduleHref, "https://dashboard.test")

    expect(url.pathname).toBe("/repayments")
    expect([...url.searchParams.keys()].sort()).toEqual([
      "scheduleStatus",
      "view",
    ])

    for (const [key, value] of url.searchParams) {
      expect(Object.keys(repaymentsFilterParamsSchema)).toContain(key)
      const parser =
        repaymentsFilterParamsSchema[
          key as keyof typeof repaymentsFilterParamsSchema
        ]
      expect(parser.parse(value)).toBe(value)
    }
  })

  test("both overdue KPI cards link to the filtered schedule", () => {
    for (const file of [
      "../../components/widgets/widget-cards.tsx",
      "../../components/analytics/analytics-view.tsx",
    ]) {
      const source = read(file)

      expect(source).toContain("href={overdueRepaymentScheduleHref}")
      expect(source).not.toContain("?status=overdue")
    }
  })

  test("the overdue action-queue item uses the same drill-down", () => {
    const source = read("../../../../../packages/db/src/queries/dashboard.ts")

    expect(source).toContain(`href: "${overdueRepaymentScheduleHref}"`)
    expect(source).not.toContain("?status=overdue")
  })
})
