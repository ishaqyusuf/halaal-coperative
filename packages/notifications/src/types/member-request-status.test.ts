import { describe, expect, test } from "bun:test"
import {
  createEmailDraftFromType,
  halaalVestNotificationTypeList,
} from "./registry"

describe("member request status notification types", () => {
  test("registers share application status notifications", () => {
    expect(halaalVestNotificationTypeList).toContain(
      "member_share_application.status_changed"
    )
    expect(halaalVestNotificationTypeList).toContain(
      "project_financing.request_status_changed"
    )
    expect(halaalVestNotificationTypeList).toContain(
      "procurement.request_status_changed"
    )
    expect(halaalVestNotificationTypeList).toContain(
      "food_purchase.application_status_changed"
    )
    expect(halaalVestNotificationTypeList).toContain(
      "food_purchase.accounting_status_changed"
    )
  })

  test("builds a direct member email draft for loan request status", () => {
    const draft = createEmailDraftFromType("loan.request_status_changed", {
      actionUrl: "https://tenant.example.com/loans",
      amount: 100000,
      loanRequestId: "loan-request-1",
      recipientEmail: "aisha@example.com",
      recipientName: "Aisha Bello",
      reviewNotes: "Approved by finance.",
      status: "approved",
      tenantName: "Demo Cooperative",
      tenantSlug: "demo-cooperative",
    })

    expect(draft).toMatchObject({
      actionLabel: "Open loans",
      actionUrl: "https://tenant.example.com/loans",
      notificationType: "loan.request_status_changed",
      recipient: {
        email: "aisha@example.com",
        value: "aisha@example.com",
      },
      subject: "Demo Cooperative: financing request approved",
    })
    expect(draft.bodyText).toContain("Approved by finance.")
    expect(draft.bodyText).toContain("100,000")
  })

  test("builds a direct guarantor approval email draft", () => {
    const draft = createEmailDraftFromType(
      "loan.guarantor_approval_requested",
      {
        amount: 100000,
        guarantorApprovalId: "guarantor-approval-1",
        loanRequestId: "loan-request-1",
        memberName: "Aisha Bello",
        recipientEmail: "musa@example.com",
        recipientName: "Musa Garba",
        tenantName: "Demo Cooperative",
        tenantSlug: "demo-cooperative",
      }
    )

    expect(draft).toMatchObject({
      actionLabel: "Review request",
      actionUrl: "/guarantor-approvals",
      notificationType: "loan.guarantor_approval_requested",
      recipient: {
        email: "musa@example.com",
        value: "musa@example.com",
      },
      subject: "Demo Cooperative: guarantor approval requested",
    })
    expect(draft.bodyText).toContain("guarantor approvals page")
    expect(draft.previewText).toContain("Aisha Bello")
  })

  test("builds a direct member email draft for share request status", () => {
    const draft = createEmailDraftFromType(
      "member_share_application.status_changed",
      {
        actionUrl: "https://tenant.example.com/shares",
        approvedUnits: 2,
        recipientEmail: "aisha@example.com",
        recipientName: "Aisha Bello",
        requestedUnits: 3,
        reviewNotes: "Two units approved.",
        shareApplicationId: "share-application-1",
        shareValue: 20000,
        status: "approved",
        tenantName: "Demo Cooperative",
        tenantSlug: "demo-cooperative",
      }
    )

    expect(draft).toMatchObject({
      actionLabel: "Open shares",
      actionUrl: "https://tenant.example.com/shares",
      notificationType: "member_share_application.status_changed",
      recipient: {
        email: "aisha@example.com",
        value: "aisha@example.com",
      },
      subject: "Demo Cooperative: share request approved",
    })
    expect(draft.bodyText).toContain("Two units approved.")
    expect(draft.bodyText).toContain("2 approved units")
  })

  test("builds a direct member email draft for project financing request status", () => {
    const draft = createEmailDraftFromType(
      "project_financing.request_status_changed",
      {
        actionUrl: "https://tenant.example.com/project-financing",
        amount: 750000,
        approvedStructure: "repayable_facility",
        businessName: "Aisha Foods",
        projectFinancingRequestId: "project-financing-1",
        recipientEmail: "aisha@example.com",
        recipientName: "Aisha Bello",
        reviewNotes: "Approved as a principal-only facility.",
        status: "approved",
        tenantName: "Demo Cooperative",
        tenantSlug: "demo-cooperative",
      }
    )

    expect(draft).toMatchObject({
      actionLabel: "Open project financing",
      actionUrl: "https://tenant.example.com/project-financing",
      notificationType: "project_financing.request_status_changed",
      recipient: {
        email: "aisha@example.com",
        value: "aisha@example.com",
      },
      subject: "Demo Cooperative: project financing request approved",
    })
    expect(draft.bodyText).toContain("Aisha Foods")
    expect(draft.bodyText).toContain("750,000")
    expect(draft.bodyText).toContain("Approved as a principal-only facility.")
  })

  test("builds a direct member email draft for procurement request status", () => {
    const draft = createEmailDraftFromType(
      "procurement.request_status_changed",
      {
        actionUrl: "https://tenant.example.com/procurement",
        amount: 180000,
        itemName: "Refrigerator",
        procurementRequestId: "procurement-1",
        recipientEmail: "aisha@example.com",
        recipientName: "Aisha Bello",
        repaymentMonths: 9,
        reviewNotes: "Approved at market cost.",
        status: "approved",
        tenantName: "Demo Cooperative",
        tenantSlug: "demo-cooperative",
        vendorName: "Local Vendor",
      }
    )

    expect(draft).toMatchObject({
      actionLabel: "Open procurement",
      actionUrl: "https://tenant.example.com/procurement",
      notificationType: "procurement.request_status_changed",
      recipient: {
        email: "aisha@example.com",
        value: "aisha@example.com",
      },
      subject: "Demo Cooperative: procurement request approved",
    })
    expect(draft.bodyText).toContain("Refrigerator")
    expect(draft.bodyText).toContain("180,000")
    expect(draft.bodyText).toContain("Approved at market cost.")
  })

  test("builds a direct member email draft for food purchase application status", () => {
    const draft = createEmailDraftFromType(
      "food_purchase.application_status_changed",
      {
        actionUrl: "https://tenant.example.com/food-purchase",
        amount: 75000,
        applicationId: "food-application-1",
        itemDescription: "Monthly food package",
        periodLabel: "Jul 2026",
        recipientEmail: "aisha@example.com",
        recipientName: "Aisha Bello",
        reviewNotes: "Approved by committee.",
        status: "approved",
        tenantName: "Demo Cooperative",
        tenantSlug: "demo-cooperative",
      }
    )

    expect(draft).toMatchObject({
      actionLabel: "Open Foodstuff Purchase",
      actionUrl: "https://tenant.example.com/food-purchase",
      notificationType: "food_purchase.application_status_changed",
      recipient: {
        email: "aisha@example.com",
        value: "aisha@example.com",
      },
      subject: "Demo Cooperative: Foodstuff Purchase application approved",
    })
    expect(draft.bodyText).toContain("Monthly food package")
    expect(draft.bodyText).toContain("75,000")
    expect(draft.bodyText).toContain("Approved by committee.")
  })

  test("builds a committee email draft for food purchase accounting status", () => {
    const draft = createEmailDraftFromType(
      "food_purchase.accounting_status_changed",
      {
        actionUrl: "https://tenant.example.com/food-purchase",
        cycleId: "food-cycle-1",
        periodLabel: "Jul 2026",
        profitAmount: 95000,
        recipientEmail: "committee@example.com",
        recipientName: "Food Committee",
        reviewNotes: "Accounting accepted for governance evidence.",
        status: "accounting_approved",
        tenantName: "Demo Cooperative",
        tenantSlug: "demo-cooperative",
      }
    )

    expect(draft).toMatchObject({
      actionLabel: "Open Foodstuff Purchase",
      actionUrl: "https://tenant.example.com/food-purchase",
      notificationType: "food_purchase.accounting_status_changed",
      recipient: {
        email: "committee@example.com",
        value: "committee@example.com",
      },
      subject: "Demo Cooperative: Foodstuff Purchase accounting approved",
    })
    expect(draft.bodyText).toContain("Jul 2026")
    expect(draft.bodyText).toContain("95,000")
    expect(draft.bodyText).toContain(
      "Accounting accepted for governance evidence."
    )
  })
})
