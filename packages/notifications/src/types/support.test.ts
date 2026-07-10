import { describe, expect, test } from "bun:test"
import {
  createEmailDraftFromType,
  halaalVestNotificationTypeList,
} from "./registry"

describe("support notification types", () => {
  test("registers support case notification events", () => {
    expect(halaalVestNotificationTypeList).toContain("support.case_created")
    expect(halaalVestNotificationTypeList).toContain("support.message_added")
    expect(halaalVestNotificationTypeList).toContain(
      "support.case_status_updated"
    )
  })

  test("builds a direct member email draft for support status changes", () => {
    const draft = createEmailDraftFromType("support.case_status_updated", {
      actionUrl: "https://tenant.example.com/support",
      recipientEmail: "aisha@example.com",
      recipientName: "Aisha Bello",
      status: "resolved",
      subject: "Receipt allocation issue",
      supportCaseId: "support-1",
      tenantName: "Demo Cooperative",
    })

    expect(draft).toMatchObject({
      actionLabel: "Open support",
      actionUrl: "https://tenant.example.com/support",
      notificationType: "support.case_status_updated",
      recipient: {
        email: "aisha@example.com",
        value: "aisha@example.com",
      },
      subject: "Demo Cooperative: support case resolved",
    })
    expect(draft.bodyText).toContain("Receipt allocation issue")
    expect(draft.bodyText).toContain("resolved")
  })
})
