import { describe, expect, test } from "bun:test"
import {
  getMobileNotificationRouting,
  parseMobileNotificationActionPayload,
} from "./mobile-notifications"

describe("mobile notification routing", () => {
  test("maps registered workflow families to safe role-aware destinations", () => {
    expect(
      getMobileNotificationRouting(
        "member_payment_receipt.status_changed",
        "member"
      )
    ).toEqual({ action: "open_receipts", category: "transactions" })
    expect(
      getMobileNotificationRouting(
        "loan.guarantor_approval_requested",
        "member"
      )
    ).toEqual({ action: "open_guarantors", category: "financing" })
    expect(
      getMobileNotificationRouting(
        "loan.guarantor_approval_requested",
        "tenant_admin"
      )
    ).toEqual({ action: "open_financing", category: "financing" })
    expect(
      getMobileNotificationRouting("import.completed", "tenant_admin")
    ).toEqual({ action: "open_reports", category: "cooperative" })
    expect(
      getMobileNotificationRouting("support.message_added", "member")
    ).toEqual({ action: "open_support", category: "support" })
    expect(
      getMobileNotificationRouting("procurement.status_changed", "member")
    ).toEqual({ action: "open_procurement", category: "financing" })
    expect(
      getMobileNotificationRouting("food_purchase.status_changed", "member")
    ).toEqual({ action: "open_food_purchase", category: "financing" })
    expect(
      getMobileNotificationRouting(
        "project_financing.status_changed",
        "tenant_admin"
      )
    ).toEqual({ action: "open_project_financing", category: "financing" })
  })

  test("rejects unknown action names and malformed identifiers", () => {
    expect(
      parseMobileNotificationActionPayload({
        action: "open_anywhere",
        intendedRole: "member",
        notificationId: "notification-1",
        tenantId: "tenant-1",
        version: 1,
      })
    ).toBeNull()
    expect(
      parseMobileNotificationActionPayload({
        action: "open_notifications",
        intendedRole: "member",
        notificationId: "",
        tenantId: "tenant-1",
        version: 1,
      })
    ).toBeNull()
    expect(
      parseMobileNotificationActionPayload({
        action: "open_receipts",
        entityId: "record id with spaces",
        intendedRole: "member",
        notificationId: "notification-1",
        tenantId: "tenant-1",
        version: 1,
      })
    ).toBeNull()
  })
})
