import { describe, expect, it } from "bun:test"
import { canReadLinkedDashboardUpload, hasLinkedDashboardUploadAccess } from "./linked-upload-access"

describe("linked evidence reads", () => {
  it("denies unlinked objects even to staff and permits staff on linked tenant records", () => {
    expect(canReadLinkedDashboardUpload("tenant_admin", "staff", "opening_balance_source", { openingBalanceLinked: false })).toBe(false)
    expect(canReadLinkedDashboardUpload("finance_officer", "staff", "opening_balance_source", { openingBalanceLinked: true })).toBe(true)
    expect(canReadLinkedDashboardUpload("operations_officer", "staff", "opening_balance_source", { openingBalanceLinked: true })).toBe(false)
    expect(canReadLinkedDashboardUpload("operations_officer", "staff", "member_document", { openingBalanceLinked: false, memberDocumentLinked: true })).toBe(true)
    expect(canReadLinkedDashboardUpload("operations_officer", "staff", "support_attachment", { openingBalanceLinked: false, supportMessageLinked: true })).toBe(true)
  })

  it("limits member reads to evidence on their own linked record", () => {
    expect(canReadLinkedDashboardUpload("member", "member-a", "opening_balance_source", { openingBalanceLinked: true })).toBe(false)
    expect(canReadLinkedDashboardUpload("member", "member-a", "payment_receipt_proof", { openingBalanceLinked: false, receiptOwnerId: "member-b" })).toBe(false)
    expect(canReadLinkedDashboardUpload("member", "member-a", "payment_receipt_proof", { openingBalanceLinked: false, receiptOwnerId: "member-a" })).toBe(true)
    expect(canReadLinkedDashboardUpload("member", "member-a", "support_attachment", { openingBalanceLinked: false, supportCaseOpenedById: "member-a" })).toBe(true)
  })

  it("refuses a linked record from a different upload purpose", () => {
    expect(canReadLinkedDashboardUpload("finance_officer", "staff", "member_document", { openingBalanceLinked: true })).toBe(false)
    expect(canReadLinkedDashboardUpload("operations_officer", "staff", "payment_receipt_proof", { openingBalanceLinked: false, supportMessageLinked: true })).toBe(false)
    expect(canReadLinkedDashboardUpload("member", "member-a", "support_attachment", { openingBalanceLinked: false, receiptOwnerId: "member-a" })).toBe(false)
  })

  it("requires the uploaded row to name the matching business-record type and id", async () => {
    const input = {
      tenantId: crypto.randomUUID(), userId: crypto.randomUUID(),
      role: "tenant_admin" as const, purpose: "member_document" as const,
      url: `/api/uploads/${crypto.randomUUID()}`,
    }
    expect(await hasLinkedDashboardUploadAccess({ ...input, linkedEntityType: null, linkedEntityId: null })).toBe(false)
    expect(await hasLinkedDashboardUploadAccess({ ...input, linkedEntityType: "SupportCaseMessage", linkedEntityId: crypto.randomUUID() })).toBe(false)
  })
})
