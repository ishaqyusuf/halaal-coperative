import { describe, expect, test } from "bun:test"
import { COOPERATIVE_MOBILE_BILLING_CRON } from "./cooperative-mobile-billing.task"

describe("cooperative mobile billing schedule", () => {
  test("runs once a day at the month-close time, not hourly", () => {
    const [minute, hour, dayOfMonth, month, dayOfWeek] =
      COOPERATIVE_MOBILE_BILLING_CRON.split(" ")

    expect(minute).toBe("15")
    expect(hour).toBe("0")
    expect([dayOfMonth, month, dayOfWeek]).toEqual(["*", "*", "*"])
  })
})
