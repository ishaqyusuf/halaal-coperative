import {
  createQaDigits,
  createQaPerson,
  createQaReference,
  qaDateOffset,
} from "@halaalvest/utils"

/*
 * Dynamic Quick Fill values come from the shared generator in
 * @halaalvest/utils: unique Nigerian Muslim names, emails made only from the
 * name on the QA Domain, and clock-based unique references and numbers. The
 * static `mobileDevQuickFill` map below holds the non-identity defaults.
 */

/** A unique dated reference, e.g. QA-PO-20261113-KX7Q2A. */
export function mobileDevQuickFillReference(prefix: string) {
  return createQaReference(prefix)
}

/** A unique synthetic person on the given QA Domain. */
export function mobileDevQuickFillPerson(emailDomain: string) {
  return createQaPerson({ emailDomain })
}

/** A unique six-digit member number (the server applies any prefix). */
export function mobileDevQuickFillMemberNumber() {
  return createQaDigits(6)
}

/** A date-only value relative to today (UTC). */
export function mobileDevQuickFillDate(offsetDays = 0) {
  return qaDateOffset(offsetDays)
}

/** The first day of next month, e.g. for a first repayment due date. */
export function mobileDevQuickFillFirstOfNextMonth() {
  const date = new Date()
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10)
}

// Passwords, OTPs, app PINs, QA Domains, and payment credentials stay manual;
// see src/dev/mobile-qa-form-coverage.ts for the per-form exclusions.
export const mobileDevQuickFill = {
  adminFinance: {
    note: "Reviewed against member eligibility, supporting records, and cooperative policy.",
  },
  // Names, emails, phones and member numbers come from
  // mobileDevQuickFillIdentity() so every fill is unique.
  adminInvite: {
    role: "finance_officer",
  },
  adminMember: {
    joinedAt: "2026-08-01",
    monthlyCommitment: "75000",
  },
  adminMemberReview: {
    kycNotes:
      "Identity, contact details, and supporting documents were verified against the member record.",
    onboardingNotes:
      "Application details and cooperative eligibility checks are complete.",
  },
  adminSupport: {
    reply:
      "We have verified the record and assigned it for completion. We will notify you when it is posted.",
  },
  adminContributions: {
    batchNotes: "QA review fixture for Collection Source posting.",
    commitmentAmount: "30000",
    extraPayoff: "0",
    extraSavings: "5000",
    rowAmount: "25000",
  },
  adminCharges: {
    basisAmount: "600000",
    correctionReason:
      "Approved correction after finance reviewed the original posting evidence.",
    notes:
      "QA charge operation reviewed against the member record and effective rule.",
  },
  adminFinancingOperations: {
    cycleNote:
      "Reviewed cycle capacity, current collections, reservations, and open finance work.",
    reviewNote:
      "Reviewed eligibility, product limits, guarantor evidence, cycle reservation, and approval history.",
  },
  adminFoodPurchaseOperations: {
    accountingReviewNotes:
      "Accounting totals and evidence reconciled against the committee submission.",
    applicationReviewNotes:
      "Approved within cycle capacity and the member obligation policy.",
    cycleAccountingNotes:
      "Committee sales, supplier cost, and operating expense evidence reconciled.",
    expenseAmount: "80000",
    purchaseCostAmount: "1120000",
    releaseNotes: "Committee release evidence verified by finance.",
    releasedAmount: "1200000",
    salesAmount: "1386500",
  },
  adminProcurementOperations: {
    activateNotes:
      "Supplier invoice and delivered item verified by the procurement officer.",
    paymentNotes: "Payment evidence received at the cooperative office.",
    reviewNotes:
      "Approved within the cooperative policy and affordability limits.",
  },
  adminProjectFinancingOperations: {
    activateEvidenceOnlyNotes:
      "Approved structure and evidence-only accounting boundary verified before activation.",
    activatePrincipalNotes:
      "Approved principal, term, and committee evidence verified before activation.",
    releaseNotes:
      "Release evidence verified against the cooperative bank record.",
    reviewEvidenceOnlyNotes:
      "Approved structure recorded as governance evidence. No repayment or profit ledger is created.",
    reviewFacilityNotes:
      "Approved as a principal-only facility within the committee decision and affordability evidence.",
  },
  adminRepaymentOperations: {
    followUpNote:
      "Member confirmed a transfer and requested a two-day follow-up window.",
    repaymentAmount: "25000",
  },
  adminShareProfitGovernance: {
    profitApprovalNotes:
      "Reviewed expenses and member allocation totals reconcile.",
    shareReviewNotes:
      "Share cap and unit-price snapshot verified for approval.",
  },
  financing: {
    extraMonthlySavingsAmount: "25000",
    purpose: "Purchase equipment for a small tailoring business.",
    requestedAmount: "450000",
    requestedTermMonths: "12",
  },
  foodPurchase: {
    itemDescription: "Rice, beans, cooking oil, and household staples.",
    requestNotes: "Please include delivery with the cooperative bulk order.",
    requestedAmount: "180000",
    requestedPaybackMonths: "3",
  },
  guarantor: {
    notes: "I know the member and confirm the repayment commitment.",
  },
  operationProfile: {
    changeReason:
      "Reviewed with the cooperative operations team and approved for the current service policy.",
  },
  procurement: {
    itemDescription: "To store frozen fish for resale at my stall in Oja Oba.",
    itemName: "Chest freezer (300L)",
    requestedCost: "185000",
    requestedRepaymentMonths: "6",
    vendorName: "Haier Thermocool, Ikeja",
  },
  projectFinancing: {
    businessDescription:
      "A neighbourhood cold-room service supporting food vendors.",
    businessName: "Barakah Cold Chain",
    projectPurpose: "Purchase solar storage and expand working capacity.",
    requestedAmount: "1250000",
    requestedPaybackMonths: "18",
  },
  receipt: {
    allocationAmount: "85000",
    memberNotes: "August commitment and voluntary savings transfer.",
    proofDocumentUrl: "https://example.test/receipts/qa-transfer-proof",
    totalAmount: "85000",
  },
  receiptSupport: {
    description:
      "This receipt was submitted successfully, but its savings allocation is not reflected in my statement.",
  },
  shareRequest: {
    notes: "Increase my long-term ownership position.",
    requestedUnits: "3",
  },
  recovery: {
    cooperativeNumber: "KAD-COOP-QA2026072701",
    email: "member-journey-1-20260727@ishaq.qa.test",
  },
  support: {
    description:
      "My August transfer is complete but the contribution is not yet reflected.",
    reply:
      "Thank you. The transfer reference is HVC-DEV-260810 and the receipt is attached to my submission.",
    subject: "August contribution not reflected",
  },
} as const
