import { describe, expect, test } from "bun:test"
import type { NotificationCenter } from "./notification-center-types"
import { presentNotificationCenterForQa } from "./notification-center-qa"

const center = {
  deliveries: [
    {
      action: "open_receipts",
      entityId: "receipt-1",
      errorMessage: null,
      id: "delivery-1",
      isRead: false,
      intendedRole: "member",
      notificationType: "member_payment_receipt.status_changed",
      occurredAt: "2026-08-31T10:00:00.000Z",
      safeSummary: "Your receipt was reviewed.",
      safeTitle: "Receipt update",
      source: "system",
      status: "sent",
    },
  ],
  generatedAt: "2026-08-31T10:00:00.000Z",
  preferences: [],
  pushRegistration: null,
  summary: {
    enabledPreferences: 0,
    failed: 0,
    queued: 0,
    sent: 1,
    totalDeliveries: 1,
    unread: 1,
  },
} satisfies NotificationCenter

describe("presentNotificationCenterForQa", () => {
  test("builds an empty inbox without changing preferences", () => {
    const result = presentNotificationCenterForQa(center, "empty")

    expect(result.deliveries).toEqual([])
    expect(result.summary.totalDeliveries).toBe(0)
    expect(result.preferences).toEqual([])
  })

  test("builds safe queued and failed delivery states", () => {
    const queued = presentNotificationCenterForQa(center, "queued")
    const failed = presentNotificationCenterForQa(center, "failed")

    expect(queued.deliveries[0]?.status).toBe("queued")
    expect(queued.summary.queued).toBe(1)
    expect(failed.deliveries[0]?.status).toBe("failed")
    expect(failed.summary.failed).toBe(1)
  })

  test("marks cached offline data stale", () => {
    const offline = presentNotificationCenterForQa(center, "offline")

    expect(offline.cache?.status).toBe("stale")
    expect(offline.cache?.reason).toBe("offline")
    expect(presentNotificationCenterForQa(center, "stale").cache?.reason).toBe(
      "stale"
    )
  })
})
