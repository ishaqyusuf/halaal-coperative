import { describe, expect, test } from "bun:test"
import { PLATFORM_BILLING_CRON } from "./platform-billing.task"

describe("platform billing schedule", () => {
  test("runs once a day at the month-close time, not hourly", () => {
    const [minute, hour, dayOfMonth, month, dayOfWeek] =
      PLATFORM_BILLING_CRON.split(" ")

    expect(minute).toBe("15")
    expect(hour).toBe("0")
    expect([dayOfMonth, month, dayOfWeek]).toEqual(["*", "*", "*"])
  })
})
