export const mobileDevQuickFill = {
  appLock: {
    pin: "246810",
  },
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
    code: "482731",
    cooperativeNumber: "KAD-COOP-QA2026072701",
    email: "member-journey-1-20260727@ishaq.qa.test",
    newPassword: "Halaalvest-QA-2468!",
  },
  support: {
    description:
      "My August transfer is complete but the contribution is not yet reflected.",
    reply:
      "Thank you. The transfer reference is HVC-DEV-260810 and the receipt is attached to my submission.",
    subject: "August contribution not reflected",
  },
} as const
