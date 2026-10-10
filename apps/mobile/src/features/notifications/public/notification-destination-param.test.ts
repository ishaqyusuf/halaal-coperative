import { describe, expect, test } from "bun:test"
import { getNotificationEntityIdParam } from "./notification-destination-param"

describe("notification destination entity param", () => {
  test("accepts only one bounded opaque identifier", () => {
    expect(getNotificationEntityIdParam("receipt-123")).toBe("receipt-123")
    expect(getNotificationEntityIdParam(["receipt-123"])).toBeNull()
    expect(getNotificationEntityIdParam("record id with spaces")).toBeNull()
    expect(getNotificationEntityIdParam(undefined)).toBeNull()
  })
})
