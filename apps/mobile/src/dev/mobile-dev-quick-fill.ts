export function mobileDevQuickFillReference(prefix: string) {
  return `${prefix}-${Date.now().toString().slice(-6)}`
}

// Passwords, OTPs, app PINs, QA Domains, and payment credentials stay manual;
// see src/dev/mobile-qa-form-coverage.ts for the per-form exclusions.
export const mobileDevQuickFill = {
  adminFinance: {
    note: "Reviewed against member eligibility, supporting records, and cooperative policy.",
  },
  adminInvite: {
    email: "zainab.finance@ishaq.qa.test",
    fullName: "Zainab Bello",
  },
  adminMember: {
    address: "14 Cooperative Crescent, Abuja",
    email: "hauwa.sani@ishaq.qa.test",
    fullName: "Hauwa Sani",
    joinedAt: "2026-08-01",
    memberNumber: "HV-1051",
    monthlyCommitment: "75000",
    occupation: "Product Designer",
    phoneNumber: "+2348012345678",
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
    batchReference: "QA-PAYROLL-BATCH",
    commitmentAmount: "30000",
    extraPayoff: "0",
    extraSavings: "5000",
    paymentReference: "QA-CONTRIBUTION-001",
    rowAmount: "25000",
  },
  adminCharges: {
    basisAmount: "600000",
    correctionReason:
      "Approved correction after finance reviewed the original posting evidence.",
    notes:
      "QA charge operation reviewed against the member record and effective rule.",
    paymentReference: "QA-CHARGE-SETTLEMENT-001",
  },
  adminFinancingOperations: {
    cycleNote:
      "Reviewed cycle capacity, current collections, reservations, and open finance work.",
    firstRepaymentDueAt: "2026-10-01",
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
    itemDescription: "Energy-efficient refrigerator for the family shop.",
    itemName: "Commercial refrigerator",
    requestedCost: "380000",
    requestedRepaymentMonths: "10",
    vendorName: "Aminah Appliances Ltd",
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
    paidAt: "2026-08-10",
    paymentReference: "HVC-DEV-260810",
    proofDocumentName: "transfer-receipt-august.pdf",
    proofDocumentUrl: "https://example.test/receipts/HVC-DEV-260810",
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
