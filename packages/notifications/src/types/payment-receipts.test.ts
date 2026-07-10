import { describe, expect, test } from "bun:test"
import {
  createEmailDraftFromType,
  halaalVestNotificationTypeList,
} from "./registry"

describe("payment receipt notification types", () => {
  test("registers payment receipt status notifications", () => {
    expect(halaalVestNotificationTypeList).toContain(
      "member_payment_receipt.status_changed"
    )
  })

  test("builds a direct member email draft for receipt review status", () => {
    const draft = createEmailDraftFromType(
      "member_payment_receipt.status_changed",
      {
        actionUrl: "https://tenant.example.com/payment-receipts",
        amount: 15000,
        paymentReference: "BANK-001",
        receiptId: "receipt-1",
        recipientEmail: "aisha@example.com",
        recipientName: "Aisha Bello",
        reviewNotes: "Payment confirmed.",
        status: "approved",
        tenantName: "Demo Cooperative",
      }
    )

    expect(draft).toMatchObject({
      actionLabel: "Open receipts",
      actionUrl: "https://tenant.example.com/payment-receipts",
      notificationType: "member_payment_receipt.status_changed",
      recipient: {
        email: "aisha@example.com",
        value: "aisha@example.com",
      },
      subject: "Demo Cooperative: payment receipt approved",
    })
    expect(draft.bodyText).toContain("BANK-001")
    expect(draft.bodyText).toContain("Payment confirmed.")
  })
})
