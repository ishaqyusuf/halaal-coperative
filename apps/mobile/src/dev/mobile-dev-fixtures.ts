import type {
  MobileAdminAccess,
  MobileAdminAccessInviteInput,
  MobileAdminActionResult,
  MobileAdminCollectionFollowUpInput,
  MobileAdminFinance,
  MobileAdminReports,
  MobileAdminSupportReplyInput,
  MobileAdminSupportStatusUpdateInput,
  MobileFinancingRequestCreateInput,
  MobileGuarantorApprovalRespondInput,
  MobileMemberFinancing,
  MobileMemberFinancingRequest,
  MobileMemberGuarantorApproval,
  MobileMemberGuarantorApprovals,
  MobileMemberMore,
  MobileMemberReceipts,
  MobileMemberSection,
  MobileMemberSectionKey,
  MobileMemberStatementSection as MobileAdminStatementSection,
  MobileMemberSupport,
  MobileNotifications,
  MobilePaymentReceipt,
  MobileReceiptCreateInput,
  MobileSupportReplyInput,
} from "@/dev/mobile-dev-fixture-contracts"
import type {
  MobileAdminMemberCreateInput,
  MobileAdminMemberDetail,
  MobileAdminMemberKycUpdateInput,
  MobileAdminMemberOnboardingReviewInput,
  MobileAdminMemberRow,
  MobileAdminMembers,
  MobileAdminMembersListInput,
  MobileAdminMemberStatusUpdateInput,
  MobileAdminOverview,
} from "@/features/admin-member-lifecycle/model/admin-member-lifecycle-types"
import type {
  AdminAccessInviteResult,
  AdminGeneratedReportPayload,
  AdminReportActivityFilters,
  AdminReportActivityPage,
  AdminReportKey,
} from "@/features/admin-reports-access/model/admin-reports-access-types"
import type {
  MobileFoodPurchaseApplication,
  MobileFoodPurchaseApplicationCreateInput,
  MobileMemberFoodPurchase,
} from "@/features/food-purchase/model/member-food-purchase-types"
import type {
  MobileMemberProcurement,
  MobileMemberProcurementRequest,
  MobileProcurementRequestCreateInput,
} from "@/features/procurement/model/member-procurement-types"
import type {
  MobileMemberProjectFinancing,
  MobileProjectFinancingRequest,
  MobileProjectFinancingRequestCreateInput,
} from "@/features/project-financing/model/member-project-financing-types"
import type {
  MobileMemberActivityKind,
  MobileMemberActivityPage,
  MobileMemberActivityRow,
  MobileMemberHome,
  MobileMemberStatement,
  MemberStatementExportPayload,
  MobileStatementActivityCategory,
} from "@/features/member-core/model/member-core-types"
import type {
  MobileMemberShareApplication,
  MobileMemberShareApplicationCreateInput,
  MobileMemberShares,
} from "@/features/shares-profit/model/member-shares-types"
import type {
  MobileSupportCase,
  MobileSupportCreateInput,
} from "@/features/support/model/member-support-types"

const generatedAt = "2026-08-11T12:00:00.000Z"
const member = {
  id: "member_demo",
  memberNumber: "HV-1024",
  name: "Yusuf Abdullahi",
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function nextId(prefix: string) {
  return `${prefix}-dev-${Date.now().toString(36)}`
}

const memberSections: Record<MobileMemberSectionKey, MobileMemberSection> = {
  commitments: {
    emptyState: "No saving activity yet.",
    generatedAt,
    key: "commitments",
    rows: [
      {
        detail: "Started 15 Jan 2024",
        format: "currency",
        interval: "Monthly",
        key: "plan-monthly",
        label: "Monthly savings",
        status: "Active",
        value: 60000,
      },
      {
        detail: "August 2026 monthly saving",
        format: "currency",
        key: "commitment-aug",
        label: "August saving",
        status: "posted",
        value: 60000,
      },
      {
        detail: "July 2026 monthly saving",
        format: "currency",
        key: "commitment-jul",
        label: "July saving",
        status: "posted",
        value: 60000,
      },
      {
        detail: "Voluntary savings balance",
        format: "currency",
        key: "special-savings",
        label: "Special savings",
        status: "active",
        value: 145000,
      },
    ],
    stats: [
      {
        detail: "Active since January 2026",
        format: "currency",
        key: "active-commitment",
        label: "Monthly saving",
        value: 60000,
      },
      {
        detail: "12 posted entries",
        format: "currency",
        key: "savings",
        label: "Savings",
        value: 860000,
      },
      {
        detail: "Voluntary savings posted",
        format: "currency",
        key: "special-savings",
        label: "Special savings",
        value: 145000,
      },
      {
        detail: "Posted contribution entries",
        format: "count",
        key: "contributions",
        label: "Contributions",
        value: 12,
      },
    ],
    subtitle:
      "Track your monthly saving, posted savings, and voluntary savings separately.",
    title: "Commitments",
  },
  financing: {
    emptyState: "No financing records yet.",
    generatedAt,
    key: "financing",
    rows: [
      {
        detail: "Murabaha equipment facility · 8 months remaining",
        format: "currency",
        key: "financing-active",
        label: "Active financing",
        status: "active",
        value: 320000,
      },
      {
        detail: "Based on savings and repayment capacity",
        format: "currency",
        key: "financing-eligible",
        label: "Current eligibility",
        status: "eligible",
        value: 900000,
      },
    ],
    stats: [
      {
        detail: "Available for a new request",
        format: "currency",
        key: "eligible",
        label: "Eligible amount",
        value: 900000,
      },
      {
        detail: "Next due 28 Aug",
        format: "currency",
        key: "monthly",
        label: "Monthly servicing",
        value: 40000,
      },
    ],
    subtitle: "Interest-free facilities and repayment position.",
    title: "Financing",
  },
  shares: {
    emptyState: "No share records yet.",
    generatedAt,
    key: "shares",
    rows: [
      {
        detail: "Approved compulsory and optional shares",
        format: "count",
        key: "share-units",
        label: "Approved units",
        status: "active",
        value: 15,
      },
      {
        detail: "At ₦25,000 per unit",
        format: "currency",
        key: "share-value",
        label: "Ownership value",
        status: "confirmed",
        value: 375000,
      },
    ],
    stats: [
      {
        detail: "15 approved units",
        format: "currency",
        key: "share-capital",
        label: "Share capital",
        value: 375000,
      },
      {
        detail: "Available to request",
        format: "count",
        key: "optional-units",
        label: "Optional units",
        value: 4,
      },
    ],
    subtitle: "Ownership, unit value, and optional share applications.",
    title: "Shares",
  },
}

let supportCases: MobileSupportCase[] = [
  {
    category: "payment_issue",
    detail:
      "Finance confirmed the bank reference and is completing allocation.",
    financialAdjustmentApprovalNotes: null,
    financialAdjustmentApprovalStatus: "not_required",
    id: "support-dev-1",
    lastActivityAt: "2026-08-10T15:15:00.000Z",
    linkedRecordId: null,
    linkedRecordType: null,
    messageCount: 3,
    moneyImpactRequested: false,
    recentMessages: [
      {
        attachmentUrl: null,
        authorName: "Yusuf Abdullahi",
        authorType: "member",
        createdAt: "2026-08-09T09:10:00.000Z",
        id: "support-message-dev-1",
        message: "My August contribution is not visible yet.",
      },
      {
        attachmentUrl: null,
        authorName: "Amina Bello",
        authorType: "staff",
        createdAt: "2026-08-10T15:15:00.000Z",
        id: "support-message-dev-2",
        message: "We found the transfer and are completing the allocation.",
      },
    ],
    priority: "normal",
    requiresFinancialAdjustment: false,
    resolutionSummary: null,
    status: "in_progress",
    subject: "August contribution not reflected",
  },
]

let receipts: MobilePaymentReceipt[] = [
  {
    allocations: [
      {
        amount: 60000,
        category: "commitment",
        id: "allocation-dev-1",
        notes: "August monthly commitment",
        periodIntent: "current_period",
        targetPeriodStart: "2026-08-01T00:00:00.000Z",
      },
      {
        amount: 25000,
        category: "special_savings",
        id: "allocation-dev-2",
        notes: "Voluntary savings top-up",
        periodIntent: "current_period",
        targetPeriodStart: null,
      },
    ],
    channel: "transfer",
    id: "receipt-dev-1",
    memberNotes: "August cooperative transfer",
    paidAt: "2026-08-08T10:30:00.000Z",
    paymentReference: "HVC-260808-014",
    proofDocumentName: "august-transfer.pdf",
    proofDocumentUrl: "https://example.test/receipts/august-transfer.pdf",
    reviewNotes: "Reference verified and allocations posted.",
    status: "approved",
    submittedAt: "2026-08-08T10:35:00.000Z",
    totalAmount: 85000,
  },
  {
    allocations: [
      {
        amount: 60000,
        category: "commitment",
        id: "allocation-dev-3",
        notes: null,
        periodIntent: "current_period",
        targetPeriodStart: "2026-07-01T00:00:00.000Z",
      },
    ],
    channel: "transfer",
    id: "receipt-dev-2",
    memberNotes: null,
    paidAt: "2026-07-06T08:00:00.000Z",
    paymentReference: "HVC-260706-008",
    proofDocumentName: "july-transfer.pdf",
    proofDocumentUrl: null,
    reviewNotes: null,
    status: "pending_review",
    submittedAt: "2026-07-06T08:03:00.000Z",
    totalAmount: 60000,
  },
]

let financingRequests: MobileMemberFinancingRequest[] = [
  {
    availablePoolSnapshot: 45000000,
    charges: [
      {
        amount: 5000,
        code: "PROCESSING",
        collectionMode: "pay_separately",
        id: "charge-dev-1",
        name: "Application processing",
        status: "posted",
      },
    ],
    eligibleAmountSnapshot: 900000,
    estimatedMonthlyServicing: 40000,
    extraMonthlySavingsAmount: 10000,
    guarantorApprovals: [
      {
        guarantorMemberNumber: "HV-1011",
        guarantorName: "Maryam Hassan",
        id: "guarantor-link-dev-1",
        respondedAt: "2026-06-03T11:00:00.000Z",
        status: "approved",
      },
    ],
    id: "financing-dev-1",
    loanProductCode: "MURABAHA-EQUIPMENT",
    loanProductName: "Equipment financing",
    purpose: "Tailoring equipment",
    requestedAmount: 480000,
    requestedAt: "2026-06-01T09:00:00.000Z",
    requestedTermMonths: 12,
    reviewNotes: "Approved within policy and available pool.",
    status: "approved",
  },
]

let procurementRequests: MobileMemberProcurementRequest[] = [
  {
    approvedCost: 240000,
    approvedMonthlyRepayment: 30000,
    approvedRepaymentMonths: 8,
    estimatedMonthlyRepayment: 30000,
    id: "procurement-dev-1",
    itemDescription: "Juki DDL-8700 for my tailoring shop in Tudun Wada.",
    itemName: "Industrial sewing machine",
    outstandingAmount: 150000,
    purchasedAt: "2026-07-20T00:00:00.000Z",
    purchaseReference: "Receipt KE-55102",
    requestedAt: "2026-07-03T09:00:00.000Z",
    requestedCost: 240000,
    requestedRepaymentMonths: 8,
    reviewNotes: "Approved from an accredited vendor.",
    scheduleItems: Array.from({ length: 8 }, (_, index) => ({
      amount: 30000,
      dueDate: new Date(Date.UTC(2026, 7 + index, 25)).toISOString(),
      id: `procurement-installment-dev-${index}`,
      installmentNumber: index + 1,
      paidAmount: index < 3 ? 30000 : 0,
      status: index < 3 ? "paid" : index === 3 ? "due" : "pending",
    })),
    status: "purchased",
    vendorName: "Kano Equipment Ltd",
  },
  ...[
    { name: "Chest freezer (300L)", vendor: "Haier Thermocool, Ikeja", amount: 185000, date: "2026-11-12", status: "pending_review" },
    { name: "HP ProBook laptop", vendor: "Slot Systems", amount: 420000, date: "2026-09-28", status: "rejected" },
    { name: "Solar inverter 3.5kVA", vendor: "Felicity Solar", amount: 310000, date: "2025-08-14", status: "completed" },
    ...["Commercial blender", "Generator 3.5kVA", "Hair dryer chair", "Office chairs (4)", "Canon printer", "Water dispenser", "Washing machine", "Gas cooker"].map((name, index) => ({
      name,
      vendor: ["Sahad Stores", "Ikeja Electronics", "Jumia Business"][index % 3]!,
      amount: [95000, 140000, 60000][index % 3]!,
      date: new Date(Date.UTC(2025, 10 - index, 1 + index)).toISOString(),
      status: index === 2 ? "cancelled" : "completed",
    })),
  ].map((item, index): MobileMemberProcurementRequest => ({
    approvedCost: item.status === "completed" ? item.amount : null,
    approvedMonthlyRepayment: null,
    approvedRepaymentMonths: null,
    estimatedMonthlyRepayment: item.amount / 6,
    id: `procurement-history-dev-${index}`,
    itemDescription: null,
    itemName: item.name,
    outstandingAmount: 0,
    purchasedAt: null,
    purchaseReference: null,
    requestedAt: new Date(item.date).toISOString(),
    requestedCost: item.amount,
    requestedRepaymentMonths: 6,
    reviewNotes: item.status === "rejected" ? "Please revise the requested repayment period." : null,
    scheduleItems: [],
    status: item.status,
    vendorName: item.vendor,
  })),
]
const procurementSubmissionResults = new Map<
  string,
  MobileMemberProcurementRequest
>()

let projectRequests: MobileProjectFinancingRequest[] = [
  {
    approvedAmount: 1500000,
    approvedMonthlyPayback: 125000,
    approvedPaybackMonths: 12,
    approvedStructure: "repayable_facility",
    businessDescription: "Tailoring and uniform production, 4 staff.",
    businessName: "Bello Tailoring Hub",
    disbursedAt: "2026-04-12T00:00:00.000Z",
    disbursementNotes: "Released against verified equipment invoice.",
    disbursementReference: "PF-HVC-2026-009",
    estimatedMonthlyPayback: 62500,
    id: "project-dev-1",
    paidAmount: 500000,
    paidAt: "2026-07-28T00:00:00.000Z",
    projectPurpose: "Two more machines and a second shop front.",
    proposedStructure: "repayable_facility",
    requestedAmount: 1200000,
    requestedAt: "2026-03-10T12:00:00.000Z",
    requestedPaybackMonths: 18,
    reviewedAt: "2026-03-18T12:00:00.000Z",
    reviewNotes: "Approved with milestone-based release.",
    status: "active",
  },
]
const projectSubmissionResults = new Map<
  string,
  MobileProjectFinancingRequest
>()

const foodCycles = [
  {
    id: "food-cycle-dev-1",
    periodMonth: "2026-12-01T00:00:00.000Z",
    releasedAmount: 12000000,
    releasedAt: "2026-08-01T08:00:00.000Z",
    releaseNotes: "December household staples cycle.",
    status: "open",
  },
]

let foodApplications: MobileFoodPurchaseApplication[] = [
  {
    approvedAmount: 150000,
    approvedPaybackMonths: 3,
    cycle: {
      id: foodCycles[0]!.id,
      periodMonth: foodCycles[0]!.periodMonth,
      releasedAmount: foodCycles[0]!.releasedAmount,
      status: foodCycles[0]!.status,
    },
    id: "food-application-dev-1",
    itemDescription: "Rice, beans, oil, and household provisions.",
    paidAmount: 50000,
    paidAt: null,
    requestedAmount: 150000,
    requestedAt: "2026-08-02T08:00:00.000Z",
    requestedPaybackMonths: 3,
    requestNotes: "Include in the cooperative bulk purchase.",
    reviewNotes: "Approved within August household limit.",
    status: "approved",
  },
]
const foodSubmissionResults = new Map<string, MobileFoodPurchaseApplication>()

let guarantorApprovals: MobileMemberGuarantorApproval[] = [
  {
    id: "guarantor-approval-dev-1",
    loanRequest: {
      borrowerMemberNumber: "QHC-0118",
      borrowerName: "Musa Ibrahim",
      estimatedMonthlyServicing: 54000,
      id: "guarantor-loan-dev-1",
      loanProductName: "Home improvement financing",
      purpose: "Roof repair and solar panels for the family home",
      requestedAmount: 600000,
      requestedAt: "2026-11-14T10:00:00.000Z",
      requestedTermMonths: 12,
      status: "under_review"
    },
    requestedAt: "2026-11-14T10:05:00.000Z",
    requestedByName: "Amina Bello",
    respondedAt: null,
    respondedByName: null,
    responseNotes: null,
    status: "pending",
    answeredByMember: false
  },
  {
    id: "guarantor-approval-dev-2",
    loanRequest: {
      borrowerMemberNumber: "QHC-0071",
      borrowerName: "Yusuf Adamu",
      estimatedMonthlyServicing: 19350,
      id: "guarantor-loan-dev-2",
      loanProductName: "Education financing",
      purpose: "School fees for his final year at the polytechnic",
      requestedAmount: 180000,
      requestedAt: "2026-09-28T10:00:00.000Z",
      requestedTermMonths: 10,
      status: "approved"
    },
    requestedAt: "2026-09-28T10:05:00.000Z",
    requestedByName: "Amina Bello",
    respondedAt: "2026-10-02T08:00:00.000Z",
    respondedByName: "Yusuf Abdullahi",
    responseNotes: "Known him six years; a steady contributor.",
    status: "approved",
    answeredByMember: true
  },
  {
    id: "guarantor-approval-dev-3",
    loanRequest: {
      borrowerMemberNumber: "QHC-0093",
      borrowerName: "Fatima Lawal",
      estimatedMonthlyServicing: 43750,
      id: "guarantor-loan-dev-3",
      loanProductName: "Business financing",
      purpose: "Restock the provisions shop before December",
      requestedAmount: 250000,
      requestedAt: "2026-11-13T10:00:00.000Z",
      requestedTermMonths: 6,
      status: "under_review"
    },
    requestedAt: "2026-11-13T10:05:00.000Z",
    requestedByName: "Amina Bello",
    respondedAt: null,
    respondedByName: null,
    responseNotes: null,
    status: "pending",
    answeredByMember: false
  },
  {
    id: "guarantor-approval-dev-4",
    loanRequest: {
      borrowerMemberNumber: "QHC-0150",
      borrowerName: "Halima Sani",
      estimatedMonthlyServicing: 41250,
      id: "guarantor-loan-dev-4",
      loanProductName: "Asset financing",
      purpose: "Delivery tricycle for the bakery",
      requestedAmount: 900000,
      requestedAt: "2026-08-12T10:00:00.000Z",
      requestedTermMonths: 24,
      status: "rejected"
    },
    requestedAt: "2026-08-12T10:05:00.000Z",
    requestedByName: "Amina Bello",
    respondedAt: "2026-08-19T08:00:00.000Z",
    respondedByName: "Yusuf Abdullahi",
    responseNotes: "I’m already backing two requests this year.",
    status: "rejected",
    answeredByMember: true
  },
  {
    id: "guarantor-approval-dev-5",
    loanRequest: {
      borrowerMemberNumber: "QHC-0034",
      borrowerName: "Ibrahim Garba",
      estimatedMonthlyServicing: 43200,
      id: "guarantor-loan-dev-5",
      loanProductName: "Business financing",
      purpose: "Two industrial sewing machines for the tailoring shop",
      requestedAmount: 320000,
      requestedAt: "2026-05-30T10:00:00.000Z",
      requestedTermMonths: 8,
      status: "rejected"
    },
    requestedAt: "2026-05-30T10:05:00.000Z",
    requestedByName: "Amina Bello",
    respondedAt: "2026-06-03T08:00:00.000Z",
    respondedByName: "Yusuf Abdullahi",
    responseNotes: null,
    status: "approved",
    answeredByMember: true
  },
  {
    id: "guarantor-approval-dev-6",
    loanRequest: {
      borrowerMemberNumber: "QHC-0201",
      borrowerName: "Zainab Musa",
      estimatedMonthlyServicing: 26250,
      id: "guarantor-loan-dev-6",
      loanProductName: "Home improvement financing",
      purpose: "Kitchen repairs and a new water tank",
      requestedAmount: 150000,
      requestedAt: "2026-03-05T10:00:00.000Z",
      requestedTermMonths: 6,
      status: "approved"
    },
    requestedAt: "2026-03-05T10:05:00.000Z",
    requestedByName: "Amina Bello",
    respondedAt: "2026-03-12T08:00:00.000Z",
    respondedByName: "Amina Bello",
    responseNotes: null,
    status: "approved",
    answeredByMember: false
  }
]

let shareApplications: MobileMemberShareApplication[] = [
  {
    approvedUnits: 2,
    createdAt: "2026-05-01T09:00:00.000Z",
    id: "share-dev-1",
    notes: "Long-term ownership increase.",
    requestedUnits: 2,
    reviewedAt: "2026-05-03T09:00:00.000Z",
    reviewNotes: "Approved from available optional allocation.",
    shareValueSnapshot: 50000,
    status: "approved",
    unitAmountSnapshot: 25000,
  },
  {
    approvedUnits: null,
    createdAt: "2026-08-08T10:00:00.000Z",
    id: "share-dev-2",
    notes: "Additional family ownership position.",
    requestedUnits: 1,
    reviewedAt: null,
    reviewNotes: null,
    shareValueSnapshot: 25000,
    status: "pending",
    unitAmountSnapshot: 25000,
  },
]

const registryPreviewNames = [
  "Jibrin Aminu", "Sakina Ibrahim", "Rabiu Abdulsalam", "Firdausi Yahaya",
  "Murtala Bashir", "Ummulkhair Sani", "Sulaiman Kolawole", "Hannatu Gambo",
  "Anas Olawale", "Bilkisu Sadiq", "Ahmad Jibril", "Maimuna Haruna",
  "Ismail Ajayi", "Saadatu Bello", "Faruk Adamu", "Hadiza Tukur",
  "Mahmud Sambo", "Zulaihat Ahmad", "Idris Bakare", "Rahma Lawan",
]
const registryPreviewMembers = registryPreviewNames.map((fullName, index): MobileAdminMemberRow => {
  const number = 48 - index
  return {
    activeMonthlyCommitment: index < 3 ? null : 25_000,
    deductionSourceName: index < 3 ? null : "Bank transfer",
    email: `member${number}@example.test`,
    fullName,
    id: `registry-preview-${number}`,
    joinedAt: "2024-08-06T00:00:00.000Z",
    kycStatus: index < 3 ? "not_started" : index % 5 === 4 ? "pending" : "verified",
    linkedUserEmail: index < 3 ? null : `member${number}@example.test`,
    memberNumber: `QHC-${String(number).padStart(4, "0")}`,
    memberType: number % 5 === 0 ? "business" : number % 3 === 0 ? "civil_servant" : "individual",
    phoneNumber: `+23480321400${number}`,
    status: index < 3 ? "pending" : index === 17 ? "suspended" : "active",
  }
})

let adminMembers: MobileAdminMemberRow[] = [
  ...registryPreviewMembers,
  {
    activeMonthlyCommitment: 75_000,
    deductionSourceName: "FCT Payroll",
    email: "yusuf.member@halaalvest.test",
    fullName: "Yusuf Abdullahi",
    id: "member_demo",
    joinedAt: "2024-01-15T00:00:00.000Z",
    kycStatus: "verified",
    linkedUserEmail: "member@halaalvest.test",
    memberNumber: "HV-1024",
    memberType: "civil_servant",
    phoneNumber: "+2348011111024",
    status: "active",
  },
  {
    activeMonthlyCommitment: 50_000,
    deductionSourceName: "Direct debit",
    email: "fatima.musa@halaalvest.test",
    fullName: "Fatima Musa",
    id: "member_dev_2",
    joinedAt: "2025-09-03T00:00:00.000Z",
    kycStatus: "pending",
    linkedUserEmail: "fatima@halaalvest.test",
    memberNumber: "HV-1032",
    memberType: "individual",
    phoneNumber: "+2348011111032",
    status: "pending",
  },
  {
    activeMonthlyCommitment: 120_000,
    deductionSourceName: "Business standing order",
    email: "ibrahim.lawal@halaalvest.test",
    fullName: "Ibrahim Lawal",
    id: "member_dev_3",
    joinedAt: "2023-04-20T00:00:00.000Z",
    kycStatus: "verified",
    linkedUserEmail: "ibrahim@halaalvest.test",
    memberNumber: "HV-1007",
    memberType: "business",
    phoneNumber: "+2348011111007",
    status: "active",
  },
]

let onboardingRequests = [
  {
    createdAt: "2026-08-09T14:00:00.000Z",
    email: "maryam.ibrahim@halaalvest.test",
    emailVerifiedAt: "2026-08-09T14:05:00.000Z",
    fullName: "Maryam Ibrahim",
    id: "onboarding-dev-1",
    linkedUserEmail: null,
    memberNumber: "HV-1048",
    phoneNumber: "+2348012345678",
    status: "pending",
  },
]

export function getDevMemberHome(): MobileMemberHome {
  return clone({
    actionItems: [
      {
        detail: "One guarantor request is waiting for your response.",
        key: "guarantor",
        label: "Guarantor response",
        severity: "warning",
      },
      {
        detail: "Your August transfer receipt is under finance review.",
        key: "receipt",
        label: "Receipt review",
        severity: "neutral",
      },
    ],
    generatedAt,
    member: { ...member, kycStatus: "verified", status: "active" },
    notifications: { unread: 3 },
    readiness: {
      detail: "Account, KYC, commitments, and repayment records are current.",
      percentage: 92,
      status: "ready",
    },
    services: [
      ["commitments", "Commitments", "BadgeCheck", "accent"],
      ["financing", "Financing", "HandCoins", "primary"],
      ["shares", "Shares", "PieChart", "accent"],
      ["receipts", "Receipts", "ReceiptText", "primary"],
      ["statements", "Statements", "FileText", "primary"],
      ["support", "Support", "Headphones", "primary"],
      ["procurement", "Procurement", "PackageSearch", "accent"],
      ["projectFinancing", "Project Financing", "BriefcaseBusiness", "primary"],
      ["foodPurchase", "Foodstuff Purchase", "ShoppingBasket", "success"],
      ["guarantors", "Guarantor approvals", "ShieldCheck", "success"],
      ["notifications", "Notifications", "Bell", "accent"],
      ["updates", "Updates", "RefreshCw", "accent"],
    ].map(([key, label, icon, tone]) => ({
      key,
      label,
      icon,
      tone,
    })) as MobileMemberHome["services"],
    stats: [
      {
        detail: "12 months current",
        format: "currency",
        key: "savings",
        label: "Savings total",
        value: 860000,
      },
      {
        detail: "15 approved units",
        format: "currency",
        key: "shares",
        label: "Share capital",
        value: 375000,
      },
      {
        detail: "Next payment 28 Aug",
        format: "currency",
        key: "financing",
        label: "Financing balance",
        value: 320000,
      },
      {
        detail: "Voluntary balance",
        format: "currency",
        key: "special",
        label: "Special savings",
        value: 145000,
      },
    ],
  })
}

export function getDevMemberSection(key: MobileMemberSectionKey) {
  return clone(memberSections[key])
}

const devPostedContributions: MobileMemberActivityRow[] = Array.from(
  { length: 12 },
  (_, index) => {
    const date = new Date(Date.UTC(2026, 7 - index, 11))
    const postedAt = date.toISOString()
    const reference = `PAY-${postedAt.slice(0, 7)}`
    const transfer = index % 4 === 3
    return {
      channel: transfer ? "Transfer" : "Payroll",
      detail: `${transfer ? "Bank transfer" : "Payroll deduction"} · Posted ${postedAt.slice(0, 10)} · Ref ${reference}`,
      extraSavings: index % 3 === 1 ? 10_000 : 0,
      format: "currency",
      key: `contribution-dev-${index}`,
      label: date.toLocaleDateString("en", { month: "long", timeZone: "UTC", year: "numeric" }),
      postedAt,
      reference,
      status: "Posted",
      value: 60_000,
    }
  }
)

const devStatementActivity: Record<MobileStatementActivityCategory, MobileMemberActivityRow[]> = {
  charges: [],
  financing: [{
    detail: "Equipment financing · 11 Aug 2026",
    entryCount: 2,
    format: "currency",
    key: "ledger-dev-repayment",
    label: "Repayment posted",
    postedAt: generatedAt,
    reference: "FCT-2608",
    status: "Loan repayment",
    value: 40_000,
  }],
  savings: devPostedContributions.map((row) => ({
    ...row,
    entryCount: 2,
    label: `${row.label} contribution`,
    status: "Contribution",
  })),
  shares: [{
    detail: "Annual allocation published 12 Apr 2026",
    entryCount: 2,
    format: "currency",
    key: "ledger-dev-dividend",
    label: "Published dividend",
    postedAt: "2026-04-12T12:00:00.000Z",
    reference: "DIV-2025",
    status: "Dividend",
    value: 12_400,
  }],
}

export function getDevMemberActivityPage(input: {
  category?: MobileStatementActivityCategory
  cursor: string | null
  kind: MobileMemberActivityKind
}): MobileMemberActivityPage {
  const rows = input.kind === "shares"
    ? memberSections.shares.rows
    : input.kind === "commitments"
      ? devPostedContributions
      : input.category
        ? devStatementActivity[input.category]
        : Object.values(devStatementActivity).flat()
            .sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""))
  return clone({
    generatedAt,
    items: input.cursor ? rows.slice(11) : rows.slice(0, 11),
    kind: input.kind,
    nextCursor: !input.cursor && rows.length > 11 ? "dev-page-2" : null,
    state: "available",
  })
}

export function getDevMemberStatement(): MobileMemberStatement {
  return clone({
    generatedAt,
    member: {
      deductionSourceName: "FCT Payroll",
      email: "member@halaalvest.test",
      exitedAt: null,
      ...member,
      joinedAt: "2024-01-15T00:00:00.000Z",
      kycStatus: "verified",
      memberType: "civil_servant",
      status: "active",
    },
    sections: [
      {
        emptyState: "No profile details.",
        key: "profile",
        rows: [
          {
            detail: "Active civil servant member",
            format: null,
            key: "profile",
            label: "Membership profile",
            status: "verified",
            value: null,
          },
        ],
        subtitle: "Identity and cooperative membership.",
        title: "Profile",
      },
      ...Object.values(memberSections).map(
        ({ emptyState, key, rows, subtitle, title }) => ({
          emptyState,
          key,
          rows,
          subtitle,
          title,
        })
      ),
      {
        emptyState: "No charge applications are available.",
        key: "charges",
        rows: [],
        subtitle: "Charges assessed to your account.",
        title: "Charges",
      },
      {
        emptyState: "No uploaded member documents are available.",
        key: "documents",
        rows: [{
          detail: "Uploaded 16 Jan 2024",
          format: null,
          key: "document-national-id",
          label: "National ID",
          status: "Verified",
          value: null,
        }],
        subtitle: "Documents recorded by the cooperative.",
        title: "Documents",
      },
      {
        emptyState: "No receipts.",
        key: "receipts",
        rows: receipts.map((receipt) => ({
          detail: receipt.paymentReference ?? "Member receipt",
          format: "currency" as const,
          key: receipt.id,
          label: "Payment receipt",
          status: receipt.status,
          value: receipt.totalAmount,
        })),
        subtitle: "Submitted payment evidence.",
        title: "Receipts",
      },
      {
        emptyState: "No ledger activity.",
        key: "ledger",
        rows: [
          {
            detail: "August contribution posting",
            format: "currency",
            key: "ledger-1",
            label: "Member contribution",
            status: "posted",
            value: 60000,
          },
        ],
        subtitle: "Audited member-account entries.",
        title: "Ledger",
      },
      {
        emptyState: "No support cases.",
        key: "support",
        rows: supportCases.map((item) => ({
          detail: item.detail,
          format: null,
          key: item.id,
          label: item.subject,
          status: item.status,
          value: null,
        })),
        subtitle: "Service and resolution history.",
        title: "Support",
      },
    ],
    stats: [
      ...getDevMemberHome().stats,
      ...memberSections.commitments.stats.filter((metric) => metric.key === "active-commitment"),
      { detail: "Published dividends", format: "currency", key: "dividends", label: "Dividends", value: 12_400 },
    ],
  })
}

export function generateDevMemberStatement(
  requestId: string
): MemberStatementExportPayload {
  const statement = getDevMemberStatement()
  const generatedAtValue = new Date().toISOString()
  const rows = statement.sections.flatMap((section) =>
    section.rows.map((row) =>
      [section.title, row.label, row.status ?? "", row.value ?? ""]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    )
  )
  return clone({
    content: ["Section,Record,Status,Value", ...rows].join("\n"),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    filename: "halaalvest-member-statement.csv",
    generatedAt: generatedAtValue,
    id: requestId,
    mimeType: "text/csv",
    rowCount: rows.length,
  })
}

export function getDevMemberMore(): MobileMemberMore {
  return clone({
    generatedAt,
    member: { ...member, kycStatus: "verified", status: "active" },
    sections: [
      {
        icon: "UserRound",
        key: "profile",
        rows: [
          {
            detail: "KYC and membership are current",
            format: null,
            key: "identity",
            label: "Verified profile",
            status: "verified",
            value: null,
          },
        ],
        title: "Profile",
      },
      {
        icon: "FileText",
        key: "statement",
        rows: [
          {
            detail: "Generated from posted cooperative records",
            format: null,
            key: "statement",
            label: "Member statement",
            status: "available",
            value: null,
          },
        ],
        title: "Statement",
      },
      {
        icon: "ReceiptText",
        key: "receipts",
        rows: [
          {
            detail: "One item awaiting review",
            format: "count",
            key: "receipts",
            label: "Payment receipts",
            status: "pending_review",
            value: receipts.length,
          },
        ],
        title: "Receipts",
      },
      {
        icon: "PackageSearch",
        key: "procurement",
        rows: [
          {
            detail: "One purchased asset",
            format: "currency",
            key: "procurement",
            label: "Outstanding",
            status: "active",
            value: 245000,
          },
        ],
        title: "Procurement",
      },
      {
        icon: "BriefcaseBusiness",
        key: "projectFinancing",
        rows: [
          {
            detail: "Barakah Cold Chain",
            format: "currency",
            key: "project",
            label: "Active project",
            status: "active",
            value: 812500,
          },
        ],
        title: "Project financing",
      },
      {
        icon: "ShoppingBasket",
        key: "foodPurchase",
        rows: [
          {
            detail: "August household cycle",
            format: "count",
            key: "food",
            label: "Applications",
            status: "open",
            value: foodApplications.length,
          },
        ],
        title: "Foodstuff Purchase",
      },
      {
        icon: "ShieldCheck",
        key: "guarantors",
        rows: [
          {
            detail: "Response requested by 14 Aug",
            format: "count",
            key: "guarantor",
            label: "Pending approvals",
            status: "pending",
            value: 1,
          },
        ],
        title: "Guarantor approvals",
      },
      {
        icon: "Headphones",
        key: "support",
        rows: [
          {
            detail: "Last updated yesterday",
            format: "count",
            key: "support",
            label: "Open cases",
            status: "in_progress",
            value: 1,
          },
        ],
        title: "Support",
      },
    ],
  })
}

export function getDevMemberShares(): MobileMemberShares {
  const pending = shareApplications
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + item.requestedUnits, 0)
  const totalApprovedUnits = 15
  const remainingOptionalUnits = Math.max(0, 20 - totalApprovedUnits - pending)
  const section = clone(memberSections.shares)
  section.generatedAt = new Date().toISOString()
  section.stats = section.stats.map((metric) =>
    metric.key === "optional-units"
      ? { ...metric, value: remainingOptionalUnits }
      : metric
  )

  return clone({
    applicationNextCursor: null,
    applicationTotal: shareApplications.length,
    applications: shareApplications,
    generatedAt,
    member,
    policy: {
      compulsoryShareUnits: 12,
      configurationMode: "unit_based",
      maximumShareUnits: 20,
      unitAmount: 25000,
    },
    position: {
      approvedOptionalUnits: 3,
      compulsoryUnits: 12,
      maximumUnits: 20,
      pendingOptionalUnits: pending,
      remainingOptionalUnits,
      totalApprovedUnits,
      totalApprovedValue: 375000,
      totalPendingUnits: totalApprovedUnits + pending,
      totalPendingValue: (totalApprovedUnits + pending) * 25000,
      unitAmount: 25000,
    },
    section,
    state: "available",
  })
}

export function getDevMemberShareApplicationsPage(input: {
  cursor?: string | null
  pageSize?: number
}) {
  const pageSize = Math.min(Math.max(input.pageSize ?? 20, 1), 50)
  const cursorIndex = input.cursor
    ? shareApplications.findIndex(
        (application) => application.id === input.cursor
      )
    : -1
  const start = cursorIndex >= 0 ? cursorIndex + 1 : 0
  const data = shareApplications.slice(start, start + pageSize)
  const hasMore = start + data.length < shareApplications.length

  return clone({
    data,
    nextCursor: hasMore ? (data.at(-1)?.id ?? null) : null,
    state: "available" as const,
    total: shareApplications.length,
  })
}

export function createDevShareApplication(
  input: MobileMemberShareApplicationCreateInput
) {
  const application: MobileMemberShareApplication = {
    approvedUnits: null,
    createdAt: new Date().toISOString(),
    id: nextId("share"),
    notes: input.notes ?? null,
    requestedUnits: input.requestedUnits,
    reviewedAt: null,
    reviewNotes: null,
    shareValueSnapshot: input.requestedUnits * 25000,
    status: "pending",
    unitAmountSnapshot: 25000,
  }
  shareApplications = [application, ...shareApplications]
  return clone(application)
}

export function getDevMemberFinancing(): MobileMemberFinancing {
  return clone({
    generatedAt,
    loanRequestCharges: [
      {
        amount: 5000,
        chargeValueType: "fixed_amount",
        code: "PROCESSING",
        collectionMode: "upfront",
        id: "charge-option-dev-1",
        name: "Application processing",
      },
    ],
    member,
    products: [
      {
        code: "MURABAHA-EQUIPMENT",
        id: "loan-product-dev-1",
        loanType: "murabaha",
        maxSavingsMultiple: 3,
        name: "Equipment financing",
        termMonths: 18,
      },
      {
        code: "EDUCATION",
        id: "loan-product-dev-2",
        loanType: "qard_hasan",
        maxSavingsMultiple: 2,
        name: "Education support",
        termMonths: 12,
      },
    ],
    requestNextCursor: null,
    requests: financingRequests,
    section: memberSections.financing,
    state: "available",
  })
}

export function getDevMemberFinancingQuote(input: {
  loanProductId: string
  requestedAmount: number
  requestedTermMonths: number
}) {
  const financing = getDevMemberFinancing()
  const product = financing.products.find(
    (item) => item.id === input.loanProductId
  )
  if (!product) throw new Error("Loan product not found")

  const eligibleAmount = 900000
  const capacityRemaining = 650000
  const blockers = [
    ...(input.requestedAmount > eligibleAmount
      ? [
          {
            key: "eligibility_exceeded",
            message:
              "Requested amount exceeds the member eligibility snapshot.",
          },
        ]
      : []),
    ...(input.requestedAmount > capacityRemaining
      ? [
          {
            key: "cycle_capacity_exceeded",
            message: "Current financing-cycle capacity is below this request.",
          },
        ]
      : []),
    ...(input.requestedTermMonths > product.termMonths
      ? [
          {
            key: "term_exceeds_product",
            message: `Requested term exceeds ${product.termMonths} months.`,
          },
        ]
      : []),
  ]

  return clone({
    availablePool: 45000000,
    blockers,
    canSubmit: blockers.length === 0,
    capacityRemaining,
    charges: [
      {
        amount: 5000,
        chargeValueType: "fixed_amount" as const,
        code: "PROCESSING",
        collectionMode: "upfront",
        id: "charge-option-dev-1",
        isRequired: true,
        name: "Application processing",
      },
    ],
    chargeQuoteHash: "0".repeat(64),
    deployableFunds: 1200000,
    eligibleAmount,
    eligibilitySavingsBase: 430000,
    estimatedMonthlyServicing: Number(
      (input.requestedAmount / input.requestedTermMonths).toFixed(2)
    ),
    feeTotal: 5000,
    generatedAt: new Date().toISOString(),
    product,
    requestedAmount: input.requestedAmount,
    requestedTermMonths: input.requestedTermMonths,
    specialSavingsCountsForEligibility: true,
    warnings: [],
  })
}

export function createDevFinancingRequest(
  input: MobileFinancingRequestCreateInput
) {
  const request: MobileMemberFinancingRequest = {
    availablePoolSnapshot: 45000000,
    charges: [
      {
        amount: 5000,
        code: "PROCESSING",
        collectionMode: "pay_separately",
        id: nextId("charge"),
        name: "Application processing",
        status: "pending",
      },
    ],
    eligibleAmountSnapshot: 900000,
    estimatedMonthlyServicing: Math.round(
      input.requestedAmount / input.requestedTermMonths
    ),
    extraMonthlySavingsAmount: input.extraMonthlySavingsAmount ?? 0,
    guarantorApprovals: [],
    id: nextId("financing"),
    loanProductCode: "MURABAHA-EQUIPMENT",
    loanProductName: "Equipment financing",
    purpose: input.purpose ?? null,
    requestedAmount: input.requestedAmount,
    requestedAt: new Date().toISOString(),
    requestedTermMonths: input.requestedTermMonths,
    reviewNotes: null,
    status: "pending_review",
  }
  financingRequests = [request, ...financingRequests]
  return clone(request)
}

export function getDevMemberProcurement(): MobileMemberProcurement {
  return clone({
    canCreateRequest: true,
    capability: {
      accessMode: "member_self_service",
      canMemberCreate: true,
      canSettleExisting: true,
      canStaffCreate: true,
      canViewExisting: true,
      serviceKey: "procurement",
      shouldShowInMemberNav: true,
      shouldShowInStaffNav: true,
    },
    chargeOptions: [
      {
        amount: 2.5,
        chargeValueType: "percentage",
        code: "PROCUREMENT_ADMIN",
        collectionMode: "included",
        id: "charge-procurement-dev",
        name: "Procurement admin fee",
      },
    ],
    generatedAt,
    member,
    policy: {
      activeFinancingBlocksProcurement: true,
      allowsCommitmentReductionDuringPayback: false,
      maximumActiveObligationsPerMember: 2,
      maximumPaybackMonths: 10,
    },
    requestNextCursor: null,
    requests: procurementRequests,
    restrictionReasons: [],
    state: "available",
    summary: {
      activeRequests: 1,
      approvedRequests: 1,
      dueScheduleItems: 1,
      outstandingAmount: 150000,
      overdueScheduleItems: 0,
      pendingRequests: procurementRequests.filter(
        (item) => item.status === "pending_review"
      ).length,
      totalRequests: procurementRequests.length,
    },
  })
}

export function createDevProcurementRequest(
  input: MobileProcurementRequestCreateInput
) {
  const existing = procurementSubmissionResults.get(input.submissionKey)
  if (existing) return clone(existing)
  const request: MobileMemberProcurementRequest = {
    approvedCost: null,
    approvedMonthlyRepayment: null,
    approvedRepaymentMonths: null,
    estimatedMonthlyRepayment: Math.round(
      input.requestedCost / input.requestedRepaymentMonths
    ),
    id: nextId("procurement"),
    itemDescription: input.itemDescription ?? null,
    itemName: input.itemName,
    outstandingAmount: input.requestedCost,
    purchasedAt: null,
    purchaseReference: null,
    requestedAt: new Date().toISOString(),
    requestedCost: input.requestedCost,
    requestedRepaymentMonths: input.requestedRepaymentMonths,
    reviewNotes: null,
    scheduleItems: [],
    status: "pending_review",
    vendorName: input.vendorName ?? null,
  }
  procurementRequests = [request, ...procurementRequests]
  procurementSubmissionResults.set(input.submissionKey, request)
  return clone(request)
}

export function getDevMemberProjectFinancing(): MobileMemberProjectFinancing {
  return clone({
    canCreateRequest: true,
    chargeOptions: [
      {
        amount: 2,
        chargeValueType: "percentage",
        code: "PROJECT_REVIEW",
        collectionMode: "pay_separately",
        id: "charge-project-dev",
        name: "Project due diligence",
      },
    ],
    eligibleStructures: [
      { requiresPaybackMonths: false, value: "undecided" },
      { requiresPaybackMonths: true, value: "repayable_facility" },
      { requiresPaybackMonths: false, value: "investment_partnership" },
      { requiresPaybackMonths: false, value: "profit_sharing" },
    ],
    generatedAt,
    member,
    requestNextCursor: null,
    requests: projectRequests,
    restrictionReasons: [],
    state: "available",
    summary: {
      activeRequests: 1,
      approvedRequests: 1,
      outstandingAmount: 1000000,
      pendingRequests: projectRequests.filter(
        (item) => item.status === "pending_review"
      ).length,
      totalApprovedAmount: 1500000,
      totalRequestedAmount: projectRequests.reduce(
        (sum, item) => sum + item.requestedAmount,
        0
      ),
      totalRequests: projectRequests.length,
    },
  })
}

export function createDevProjectFinancingRequest(
  input: MobileProjectFinancingRequestCreateInput
) {
  const existing = projectSubmissionResults.get(input.submissionKey)
  if (existing) return clone(existing)
  const request: MobileProjectFinancingRequest = {
    approvedAmount: null,
    approvedMonthlyPayback: null,
    approvedPaybackMonths: null,
    approvedStructure: null,
    businessDescription: input.businessDescription ?? null,
    businessName: input.businessName,
    disbursedAt: null,
    disbursementNotes: null,
    disbursementReference: null,
    estimatedMonthlyPayback: input.requestedPaybackMonths
      ? Math.round(input.requestedAmount / input.requestedPaybackMonths)
      : null,
    id: nextId("project"),
    paidAmount: 0,
    paidAt: null,
    projectPurpose: input.projectPurpose ?? null,
    proposedStructure: input.proposedStructure ?? "undecided",
    requestedAmount: input.requestedAmount,
    requestedAt: new Date().toISOString(),
    requestedPaybackMonths: input.requestedPaybackMonths ?? null,
    reviewedAt: null,
    reviewNotes: null,
    status: "pending_review",
  }
  projectRequests = [request, ...projectRequests]
  projectSubmissionResults.set(input.submissionKey, request)
  return clone(request)
}

export function getDevMemberFoodPurchase(): MobileMemberFoodPurchase {
  return clone({
    applicationNextCursor: null,
    applications: foodApplications,
    canCreateApplication: true,
    capability: {
      accessMode: "member_self_service",
      canMemberCreate: true,
      canSettleExisting: true,
      canStaffCreate: true,
      canViewExisting: true,
      serviceKey: "food_purchase",
      shouldShowInMemberNav: true,
      shouldShowInStaffNav: true,
    },
    chargeOptions: [
      {
        amount: 1500,
        chargeValueType: "fixed_amount",
        code: "FOOD_ADMIN",
        collectionMode: "included",
        id: "charge-food-dev",
        name: "Cycle administration",
      },
    ],
    cycles: foodCycles,
    generatedAt,
    member,
    policy: {
      allowsCommitmentReductionDuringPayback: false,
      maximumActiveObligationsPerMember: 2,
      maximumPaybackMonths: 3,
      requiresOpenCycle: true,
    },
    restrictionReasons: [],
    state: "available",
    summary: {
      approvedApplications: foodApplications.filter(
        (item) => item.status === "approved"
      ).length,
      openCycles: 1,
      pendingApplications: foodApplications.filter(
        (item) => item.status === "pending_review"
      ).length,
      totalApplications: foodApplications.length,
    },
  })
}

export function createDevFoodPurchaseApplication(
  input: MobileFoodPurchaseApplicationCreateInput
) {
  const existing = foodSubmissionResults.get(input.submissionKey)
  if (existing) return clone(existing)
  const cycle =
    foodCycles.find((item) => item.id === input.cycleId) ?? foodCycles[0]!
  const application: MobileFoodPurchaseApplication = {
    approvedAmount: null,
    approvedPaybackMonths: null,
    cycle: {
      id: cycle.id,
      periodMonth: cycle.periodMonth,
      releasedAmount: cycle.releasedAmount,
      status: cycle.status,
    },
    id: nextId("food"),
    itemDescription: input.itemDescription ?? null,
    paidAmount: 0,
    paidAt: null,
    requestedAmount: input.requestedAmount,
    requestedAt: new Date().toISOString(),
    requestedPaybackMonths: input.requestedPaybackMonths,
    requestNotes: input.requestNotes ?? null,
    reviewNotes: null,
    status: "pending_review",
  }
  foodApplications = [application, ...foodApplications]
  foodSubmissionResults.set(input.submissionKey, application)
  return clone(application)
}

export function getDevMemberGuarantorApprovals(): MobileMemberGuarantorApprovals {
  return clone({
    approvals: [...guarantorApprovals].sort((a, b) =>
      Number(b.status === "pending") - Number(a.status === "pending") ||
      b.requestedAt.localeCompare(a.requestedAt)
    ),
    generatedAt,
    member,
    summary: {
      approvedApprovals: guarantorApprovals.filter(
        (item) => item.status === "approved"
      ).length,
      pendingApprovals: guarantorApprovals.filter(
        (item) => item.status === "pending"
      ).length,
      rejectedApprovals: guarantorApprovals.filter(
        (item) => item.status === "rejected"
      ).length,
      totalApprovals: guarantorApprovals.length,
    },
  })
}

export function respondDevGuarantorApproval(
  input: MobileGuarantorApprovalRespondInput
) {
  const approval = guarantorApprovals.find(
    (item) => item.id === input.guarantorApprovalId
  )
  if (!approval)
    throw new Error("Development guarantor approval was not found.")
  const updated: MobileMemberGuarantorApproval = {
    ...approval,
    respondedAt: new Date().toISOString(),
    respondedByName: member.name,
    answeredByMember: true,
    responseNotes: input.notes ?? null,
    status: input.status,
  }
  guarantorApprovals = guarantorApprovals.map((item) =>
    item.id === updated.id ? updated : item
  )
  return clone(updated)
}

export function getDevMemberReceipts(): MobileMemberReceipts {
  return clone({
    canCreateReceipt: true,
    generatedAt,
    member,
    receipts,
    summary: {
      approvedReceipts: receipts.filter((item) => item.status === "approved")
        .length,
      correctionRequestedReceipts: receipts.filter(
        (item) => item.status === "correction_requested"
      ).length,
      pendingReviewReceipts: receipts.filter(
        (item) => item.status === "pending_review"
      ).length,
      rejectedReceipts: receipts.filter((item) => item.status === "rejected")
        .length,
    },
  })
}

export function createDevMemberReceipt(input: MobileReceiptCreateInput) {
  const receipt: MobilePaymentReceipt = {
    allocations: input.allocations.map((allocation) => ({
      ...allocation,
      id: nextId("allocation"),
      notes: allocation.notes ?? null,
      periodIntent: allocation.periodIntent ?? "unspecified",
      targetPeriodStart: allocation.targetPeriodStart ?? null,
    })),
    channel: input.channel ?? "transfer",
    id: nextId("receipt"),
    memberNotes: input.memberNotes ?? null,
    paidAt: input.paidAt,
    paymentReference: input.paymentReference ?? null,
    proofDocumentName: input.proofDocumentName ?? null,
    proofDocumentUrl: input.proofDocumentUrl ?? null,
    reviewedAt: null,
    reviewNotes: null,
    status: "pending_review",
    submittedAt: new Date().toISOString(),
    totalAmount: input.totalAmount,
  }
  receipts = [receipt, ...receipts]
  return clone(receipt)
}

export function getDevMemberSupport(): MobileMemberSupport {
  return clone({
    cases: supportCases,
    generatedAt,
    member,
    summary: {
      highPriorityOpenCases: 0,
      openCases: supportCases.filter(
        (item) => !["closed", "resolved"].includes(item.status)
      ).length,
      totalCases: supportCases.length,
    },
  })
}

export function createDevSupportCase(input: MobileSupportCreateInput) {
  const supportCase: MobileSupportCase = {
    category: input.category,
    detail: input.description,
    financialAdjustmentApprovalStatus: input.moneyImpactRequested
      ? "pending"
      : "not_required",
    financialAdjustmentApprovalNotes: null,
    id: nextId("support"),
    lastActivityAt: new Date().toISOString(),
    linkedRecordId: input.linkedRecordId ?? null,
    linkedRecordType: input.linkedRecordType ?? null,
    messageCount: 1,
    moneyImpactRequested: Boolean(input.moneyImpactRequested),
    recentMessages: [
      {
        attachmentUrl: null,
        authorName: member.name,
        authorType: "member",
        createdAt: new Date().toISOString(),
        id: nextId("support-message"),
        message: input.description,
      },
    ],
    priority: "normal",
    requiresFinancialAdjustment: Boolean(input.moneyImpactRequested),
    resolutionSummary: null,
    status: "open",
    subject: input.subject,
  }
  supportCases = [supportCase, ...supportCases]
  return clone(supportCase)
}

export function replyDevSupportCase(
  input: MobileSupportReplyInput | MobileAdminSupportReplyInput,
  authorType: "member" | "staff" = "staff"
) {
  const supportCase = supportCases.find(
    (item) => item.id === input.supportCaseId
  )
  if (!supportCase) throw new Error("Development support case was not found.")
  const updated = {
    ...supportCase,
    lastActivityAt: new Date().toISOString(),
    messageCount: supportCase.messageCount + 1,
    recentMessages: [
      ...supportCase.recentMessages,
      {
        attachmentUrl: input.attachmentUrl ?? null,
        authorName: authorType === "member" ? member.name : "Amina Bello",
        authorType,
        createdAt: new Date().toISOString(),
        id: nextId("support-message"),
        message: input.message,
      },
    ],
  }
  supportCases = supportCases.map((item) =>
    item.id === updated.id ? updated : item
  )
  return clone(updated)
}

export function updateDevSupportStatus(
  input: MobileAdminSupportStatusUpdateInput
) {
  const supportCase = supportCases.find(
    (item) => item.id === input.supportCaseId
  )
  if (!supportCase) throw new Error("Development support case was not found.")
  const updated = {
    ...supportCase,
    priority: input.priority ?? supportCase.priority,
    requiresFinancialAdjustment:
      input.requiresFinancialAdjustment ??
      supportCase.requiresFinancialAdjustment,
    status: input.status,
    detail: input.resolutionSummary ?? supportCase.detail,
  }
  supportCases = supportCases.map((item) =>
    item.id === updated.id ? updated : item
  )
  return clone(updated)
}

export function getDevAdminOverview(): MobileAdminOverview {
  return clone({
    actionQueue: [
      {
        count: 7,
        detail: "Financing, procurement, and receipt decisions",
        key: "finance",
        label: "Finance reviews",
        severity: "warning",
      },
      {
        count: 3,
        detail: "Membership and KYC checks",
        key: "members",
        label: "Member onboarding",
        severity: "neutral",
      },
      {
        count: 2,
        detail: "Open member service cases",
        key: "support",
        label: "Support cases",
        severity: "neutral",
      },
    ],
    complianceWatch: [
      { count: 2, key: "kyc-incomplete", label: "Incomplete KYC" },
      { count: 1, key: "document-review", label: "Documents to review" },
    ],
    generatedAt,
    recentActivity: [
      {
        detail: "Yusuf Abdullahi posted ₦60,000",
        id: "activity-contribution-dev-1",
        label: "Contribution posted",
        occurredAt: "2026-08-11T09:40:00.000Z",
      },
      {
        detail: "Amina Musa · submitted",
        id: "activity-financing-dev-1",
        label: "Financing request updated",
        occurredAt: "2026-08-10T14:10:00.000Z",
      },
    ],
    stats: [
      {
        detail: "1 pending onboarding",
        format: "count",
        key: "members",
        label: "Active members",
        value: 1248,
      },
      {
        detail: "94% on schedule",
        format: "currency",
        key: "collections",
        label: "Collections",
        value: 42000000,
      },
      {
        detail: "Across active facilities",
        format: "currency",
        key: "portfolio",
        label: "Financing portfolio",
        value: 18400000,
      },
    ],
    warnings: [
      {
        key: "receipt-review",
        label: "One receipt review is nearing its service target.",
      },
    ],
  })
}

export function getDevAdminMembers(
  input?: MobileAdminMembersListInput
): MobileAdminMembers {
  const search = input?.search?.trim().toLowerCase()
  let rows = adminMembers.filter(
    (item) =>
      (!input?.status || item.status === input.status) &&
      (!input?.kycStatus || item.kycStatus === input.kycStatus) &&
      (!input?.needsReview || (item.status === "active" && item.kycStatus !== "verified"))
  )
  if (search)
    rows = rows.filter((item) =>
      [item.fullName, item.memberNumber].some((value) =>
        value.toLowerCase().includes(search)
      ) || (/^[+()\s.\d-]+$/.test(search) && search.replace(/\D/g, "").length >= 3 && item.phoneNumber?.replace(/\D/g, "").includes(search.replace(/\D/g, "")))
    )
  return clone({
    generatedAt,
    memberExpansion: {
      activeMemberCount: adminMembers.filter((item) => item.status === "active")
        .length,
      activeMemberLimit: 100,
      planCode: "free_beta",
      planName: "Free Beta",
      reason: null,
      status: "available",
    },
    members: rows,
    onboardingRequests,
    page: input?.page ?? 1,
    pageSize: input?.pageSize ?? 20,
    reviewQueues: [
      {
        count: onboardingRequests.length,
        detail: "Verified sign-ups awaiting cooperative review",
        key: "membership-approvals",
        label: "Membership approvals",
        severity: "warning",
      },
      {
        count: adminMembers.filter((item) => item.kycStatus === "pending")
          .length,
        detail: "Identity documents awaiting review",
        key: "kyc-documents",
        label: "KYC documents",
        severity: "neutral",
      },
    ],
    summary: {
      activeCount: adminMembers.filter((item) => item.status === "active")
        .length,
      kycPendingCount: adminMembers.filter(
        (item) => item.kycStatus === "pending"
      ).length,
      linkedUsersCount: adminMembers.filter((item) => item.linkedUserEmail)
        .length,
      pageCount: 1,
      totalCount: adminMembers.length,
    },
    total: rows.length,
  })
}

export function getDevAdminMemberDetail(
  memberId: string
): MobileAdminMemberDetail {
  const row = adminMembers.find((item) => item.id === memberId)
  if (!row) return { generatedAt, member: null, sections: [], stats: [] }
  const sections = getDevMemberStatement()
    .sections.filter((section) => section.key !== "charges")
    .map((section) =>
      section.key === "profile"
        ? {
            ...section,
            rows: section.rows.map((profileRow) => ({
              ...profileRow,
              detail: `${row.memberType.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())} member`,
              status: row.kycStatus,
            })),
          }
        : section
    ) as MobileAdminStatementSection[]

  return clone({
    generatedAt,
    member: { ...row, exitedAt: null, linkedUserName: row.fullName },
    sections,
    stats: getDevMemberHome().stats,
  })
}

export function createDevAdminMember(input: MobileAdminMemberCreateInput) {
  if (adminMembers.some(({ memberNumber }) => memberNumber.toLowerCase() === input.memberNumber.toLowerCase())) {
    throw new Error(`Member number ${input.memberNumber} is already used. Choose another number.`)
  }
  const row: MobileAdminMemberRow = {
    activeMonthlyCommitment: input.monthlyCommitment ?? null,
    deductionSourceName: null,
    email: input.email ?? null,
    fullName: input.fullName,
    id: nextId("member"),
    joinedAt: input.joinedAt,
    kycStatus: "not_started",
    linkedUserEmail: null,
    memberNumber: input.memberNumber,
    memberType: input.memberType,
    phoneNumber: input.phoneNumber ?? null,
    status: "pending",
  }
  adminMembers = [row, ...adminMembers]
  return clone(row)
}

export function updateDevAdminMemberStatus(
  input: MobileAdminMemberStatusUpdateInput
): MobileAdminActionResult {
  adminMembers = adminMembers.map((item) =>
    item.id === input.memberId ? { ...item, status: input.status } : item
  )
  return { id: input.memberId, status: input.status }
}

export function updateDevAdminMemberKyc(
  input: MobileAdminMemberKycUpdateInput
) {
  adminMembers = adminMembers.map((item) =>
    item.id === input.memberId ? { ...item, kycStatus: input.kycStatus } : item
  )
  return { id: input.memberId, kycStatus: input.kycStatus }
}

export function reviewDevOnboarding(
  input: MobileAdminMemberOnboardingReviewInput
): MobileAdminActionResult {
  const request = onboardingRequests.find((item) => item.id === input.requestId)
  if (!request) throw new Error("Development onboarding request was not found.")

  if (input.decision === "approved") {
    adminMembers = [
      {
        activeMonthlyCommitment: null,
        deductionSourceName: null,
        email: request.email,
        fullName: request.fullName,
        id: nextId("member"),
        joinedAt: new Date().toISOString(),
        kycStatus: "not_started",
        linkedUserEmail: request.email,
        memberNumber: request.memberNumber,
        memberType: "individual",
        phoneNumber: request.phoneNumber,
        status: "active",
      },
      ...adminMembers,
    ]
  }

  onboardingRequests = onboardingRequests.filter(
    (item) => item.id !== input.requestId
  )
  return { id: input.requestId, status: input.decision }
}

export function getDevAdminFinance(): MobileAdminFinance {
  return clone({
    collectionFollowUps: [
      {
        caseStage: "reminder",
        createdAt: "2026-08-10T09:00:00.000Z",
        id: "follow-up-dev-1",
        loanProductName: "Equipment financing",
        memberName: "Ibrahim Lawal",
        memberNumber: "HV-1007",
        nextActionAt: "2026-08-14T09:00:00.000Z",
        note: "Member confirmed salary-credit date.",
        priority: "normal",
        repaymentScheduleItemId: "schedule-admin-dev-1",
        resolutionStatus: "open",
        status: "promise_to_pay",
      },
    ],
    generatedAt,
    queues: [
      {
        count: 3,
        detail: "Member facility requests",
        key: "financing",
        label: "Financing",
        severity: "warning",
      },
      {
        count: 2,
        detail: "Payment evidence awaiting review",
        key: "receipts",
        label: "Receipts",
        severity: "neutral",
      },
      {
        count: 1,
        detail: "Optional ownership applications",
        key: "shares",
        label: "Share requests",
        severity: "neutral",
      },
      {
        count: 2,
        detail: "Member asset requests",
        key: "procurement",
        label: "Procurement",
        severity: "neutral",
      },
    ],
    recentItems: [
      {
        amount: 450000,
        id: "financing-dev-pending",
        queueKey: "financing",
        requestedAt: "2026-08-10T10:00:00.000Z",
        status: "pending_review",
        subtitle: "Yusuf Abdullahi · Equipment financing",
        title: "Financing request",
      },
      {
        amount: 85000,
        id: "receipt-dev-2",
        queueKey: "receipts",
        requestedAt: "2026-08-09T09:00:00.000Z",
        status: "pending_review",
        subtitle: "HV-1024 · HVC-260706-008",
        title: "Payment receipt",
      },
      {
        amount: 25000,
        id: "share-dev-2",
        queueKey: "shares",
        requestedAt: "2026-08-08T10:00:00.000Z",
        status: "pending",
        subtitle: "Yusuf Abdullahi · 1 optional unit",
        title: "Share application",
      },
      {
        amount: 380000,
        id: "procurement-dev-pending",
        queueKey: "procurement",
        requestedAt: "2026-08-07T10:00:00.000Z",
        status: "pending_review",
        subtitle: "Fatima Musa · Commercial refrigerator",
        title: "Procurement request",
      },
      {
        amount: 1250000,
        id: "project-dev-pending",
        queueKey: "projectFinancing",
        requestedAt: "2026-08-06T10:00:00.000Z",
        status: "pending_review",
        subtitle: "Barakah Cold Chain",
        title: "Project financing",
      },
      {
        amount: 180000,
        id: "food-dev-pending",
        queueKey: "foodPurchase",
        requestedAt: "2026-08-05T10:00:00.000Z",
        status: "pending_review",
        subtitle: "HV-1032 · August cycle",
        title: "Foodstuff Purchase",
      },
    ],
    stats: [
      {
        detail: "Across six queues",
        format: "count",
        key: "reviews",
        label: "Pending reviews",
        value: 11,
      },
      {
        detail: "Month to date",
        format: "currency",
        key: "receipts",
        label: "Receipts received",
        value: 7200000,
      },
      {
        detail: "Active repayment schedules",
        format: "currency",
        key: "outstanding",
        label: "Outstanding",
        value: 18400000,
      },
    ],
  })
}

export function getDevAdminReports(): MobileAdminReports {
  return clone({
    activityEvents: [
      {
        action: "approve",
        actionLabel: "Approved receipt",
        actorLabel: "Amina Bello",
        actorType: "user",
        authorizationRole: "finance_officer",
        authorizerLabel: "Tenant policy",
        entityId: "receipt-dev-1",
        entityType: "payment_receipt",
        id: "activity-dev-1",
        metadataSummary: ["₦85,000", "2 allocations"],
        occurredAt: "2026-08-10T12:00:00.000Z",
      },
      {
        action: "update",
        actionLabel: "Updated member KYC",
        actorLabel: "Amina Bello",
        actorType: "user",
        authorizationRole: "tenant_admin",
        authorizerLabel: "Tenant policy",
        entityId: "member_demo",
        entityType: "member",
        id: "activity-dev-2",
        metadataSummary: ["verified"],
        occurredAt: "2026-08-09T08:00:00.000Z",
      },
    ],
    collectionFollowUps: getDevAdminFinance().collectionFollowUps,
    generatedAt,
    reports: [
      {
        available: true,
        category: "members",
        detail: "Membership status and cooperative profile data.",
        key: "members",
        metricFormat: "count",
        metricLabel: "Members",
        metricValue: 100,
        rowLimit: 5000,
        title: "Member register",
      },
      {
        available: true,
        category: "members",
        detail: "Member balances, obligations and posted activity.",
        key: "memberStatements",
        metricFormat: "count",
        metricLabel: "Members",
        metricValue: 100,
        rowLimit: 5000,
        title: "Member statements",
      },
      {
        available: true,
        category: "finance",
        detail: "Committed contributions and posted payments.",
        key: "contributions",
        metricFormat: "currency",
        metricLabel: "Received",
        metricValue: 7200000,
        rowLimit: 5000,
        title: "Contributions",
      },
      {
        available: true,
        category: "finance",
        detail: "Voluntary and extra savings posted for members.",
        key: "specialSavings",
        metricFormat: "currency",
        metricLabel: "Posted",
        metricValue: 1450000,
        rowLimit: 5000,
        title: "Special savings",
      },
      {
        available: true,
        category: "finance",
        detail: "Assessed charges, settlement state and source.",
        key: "charges",
        metricFormat: "count",
        metricLabel: "Open queue",
        metricValue: 12,
        rowLimit: 5000,
        title: "Charges",
      },
      {
        available: true,
        category: "finance",
        detail: "Requests, facilities and outstanding principal.",
        key: "financing",
        metricFormat: "currency",
        metricLabel: "Outstanding",
        metricValue: 18400000,
        rowLimit: 5000,
        title: "Financing",
      },
      {
        available: true,
        category: "finance",
        detail: "Posted repayments and collection references.",
        key: "repayments",
        metricFormat: "currency",
        metricLabel: "Collected",
        metricValue: 5600000,
        rowLimit: 5000,
        title: "Repayments",
      },
      {
        available: true,
        category: "finance",
        detail: "Member payment receipts and review outcomes.",
        key: "paymentReceipts",
        metricFormat: "count",
        metricLabel: "Pending review",
        metricValue: 4,
        rowLimit: 5000,
        title: "Payment receipts",
      },
      {
        available: true,
        category: "operations",
        detail: "Requests, fulfillment and payment evidence.",
        key: "procurement",
        metricFormat: "count",
        metricLabel: "Pending review",
        metricValue: 3,
        rowLimit: 5000,
        title: "Procurement",
      },
      {
        available: true,
        category: "operations",
        detail: "Applications and monthly cycle evidence.",
        key: "foodPurchase",
        metricFormat: "count",
        metricLabel: "Open queue",
        metricValue: 4,
        rowLimit: 5000,
        title: "Foodstuff Purchase",
      },
      {
        available: true,
        category: "operations",
        detail: "Structure, review and release evidence.",
        key: "projectFinancing",
        metricFormat: "count",
        metricLabel: "Pending review",
        metricValue: 2,
        rowLimit: 5000,
        title: "Project financing",
      },
      {
        available: true,
        category: "finance",
        detail: "Compulsory and optional share-capital positions.",
        key: "shares",
        metricFormat: "currency",
        metricLabel: "Share capital",
        metricValue: 10000000,
        rowLimit: 5000,
        title: "Shares",
      },
      {
        available: true,
        category: "finance",
        detail: "Approved profit periods and published allocations.",
        key: "profit",
        metricFormat: "currency",
        metricLabel: "Pending allocation",
        metricValue: 1200000,
        rowLimit: 5000,
        title: "Profit and dividends",
      },
      {
        available: true,
        category: "operations",
        detail: "Support cases, priority and resolution state.",
        key: "support",
        metricFormat: "count",
        metricLabel: "Open cases",
        metricValue: 6,
        rowLimit: 5000,
        title: "Support",
      },
      {
        available: true,
        category: "governance",
        detail: "Brought-forward member balances and review state.",
        key: "openingBalances",
        metricFormat: "count",
        metricLabel: "Entries",
        metricValue: 100,
        rowLimit: 5000,
        title: "Opening balances",
      },
      {
        available: true,
        category: "governance",
        detail: "Actor, authorizer and redacted change evidence.",
        key: "audit",
        metricFormat: "count",
        metricLabel: "Recent events",
        metricValue: 128,
        rowLimit: 5000,
        title: "Audit activity",
      },
    ],
    stats: [
      {
        detail: "Current reporting month",
        format: "count",
        key: "reports",
        label: "Reports",
        value: 16,
      },
      {
        detail: "Recorded administrator events",
        format: "count",
        key: "audit",
        label: "Audit events",
        value: 128,
      },
    ],
  })
}

export function getDevAdminReportActivity(input: {
  cursor?: string | null
  filters?: Partial<AdminReportActivityFilters>
  limit?: number
}): AdminReportActivityPage {
  const reports = getDevAdminReports()
  const query = input.filters?.search?.trim().toLowerCase()
  const offset = input.cursor ? Number(input.cursor) : 0
  const limit = input.limit ?? 25
  const filtered = reports.activityEvents.filter((event) => {
    if (input.filters?.action && event.action !== input.filters.action) {
      return false
    }
    if (
      input.filters?.entityType &&
      event.entityType !== input.filters.entityType
    ) {
      return false
    }
    if (!query) return true
    return [
      event.actionLabel,
      event.actorLabel,
      event.authorizerLabel,
      event.entityType,
      ...event.metadataSummary,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query)
  })
  const items = filtered.slice(offset, offset + limit)
  return clone({
    items,
    nextCursor:
      offset + items.length < filtered.length
        ? String(offset + items.length)
        : null,
  })
}

export function generateDevAdminReport(input: {
  key: AdminReportKey
  requestId: string
}): AdminGeneratedReportPayload {
  const report = getDevAdminReports().reports.find(
    (item) => item.key === input.key
  )
  const generatedAtValue = new Date().toISOString()
  return clone({
    content: [
      "Record,Status,Reference",
      `${report?.title ?? input.key},posted,QA-001`,
      `${report?.title ?? input.key},reviewed,QA-002`,
    ].join("\n"),
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    filename: `halaalvest-${input.key}-report.csv`,
    generatedAt: generatedAtValue,
    id: input.requestId,
    key: input.key,
    mimeType: "text/csv",
    rowCount: 2,
  })
}

export function getDevNotifications(
  cooperativeRole:
    | "super_admin"
    | "tenant_admin"
    | "finance_officer"
    | "operations_officer"
    | "member" = "member"
): MobileNotifications {
  const memberDeliveries: MobileNotifications["deliveries"] = [
    {
      action: "open_receipts",
      entityId: "receipt-dev-1",
      errorMessage: null,
      id: "notification-dev-1",
      intendedRole: "member",
      notificationType: "receipt_approved",
      occurredAt: "2026-08-10T12:05:00.000Z",
      recipient: "member@halaalvest.test",
      safeSummary: "Your payment receipt was approved and posted.",
      safeTitle: "Receipt approved",
      source: "finance",
      status: "sent",
    },
    {
      action: "open_guarantors",
      entityId: "guarantor-approval-dev-1",
      errorMessage: null,
      id: "notification-dev-2",
      intendedRole: "member",
      notificationType: "guarantor_request",
      occurredAt: "2026-08-09T11:05:00.000Z",
      recipient: "member@halaalvest.test",
      safeSummary: "A member requested your guarantor response.",
      safeTitle: "Guarantor response requested",
      source: "financing",
      status: "queued",
    },
    {
      action: "open_support",
      entityId: "support-dev-1",
      errorMessage: "Provider timeout",
      id: "notification-dev-3",
      intendedRole: "member",
      notificationType: "support_reply",
      occurredAt: "2026-08-08T15:00:00.000Z",
      recipient: "member@halaalvest.test",
      safeSummary: "Your support case has a new reply.",
      safeTitle: "Support reply",
      source: "support",
      status: "failed",
    },
  ]
  const adminDeliveries: MobileNotifications["deliveries"] = [
    {
      action: "open_financing",
      entityId: "6a6ab8d7-40a0-4e64-8504-e8a4cc7c0001",
      errorMessage: null,
      id: "notification-dev-admin-1",
      intendedRole: cooperativeRole,
      notificationType: "financing_review_ready",
      occurredAt: "2026-08-10T12:05:00.000Z",
      recipient: "@ishaq.qa.test",
      safeSummary: "A financing request is ready for review.",
      safeTitle: "Financing review ready",
      source: "financing",
      status: "sent",
    },
    {
      action: "open_reports",
      entityId: "activity-dev-1",
      errorMessage: null,
      id: "notification-dev-admin-2",
      intendedRole: cooperativeRole,
      notificationType: "report_ready",
      occurredAt: "2026-08-09T11:05:00.000Z",
      recipient: "@ishaq.qa.test",
      safeSummary: "A requested report is available.",
      safeTitle: "Report ready",
      source: "reports",
      status: "queued",
    },
    {
      action: "open_support",
      entityId: "support-dev-1",
      errorMessage: "Provider timeout",
      id: "notification-dev-admin-3",
      intendedRole: cooperativeRole,
      notificationType: "support_case_updated",
      occurredAt: "2026-08-08T15:00:00.000Z",
      recipient: "@ishaq.qa.test",
      safeSummary: "A support case has new activity.",
      safeTitle: "Support case updated",
      source: "support",
      status: "failed",
    },
  ]
  const deliveries =
    cooperativeRole === "member" ? memberDeliveries : adminDeliveries
  return clone({
    deliveries,
    generatedAt,
    preferences: [
      {
        available: true,
        channel: "push",
        description: "Sign-in and device protection",
        enabled: true,
        key: "security",
        mandatory: true,
        title: "Security",
      },
      {
        available: true,
        channel: "push",
        description: "Receipts and account changes",
        enabled: true,
        key: "transactions",
        mandatory: true,
        title: "Transactions",
      },
      {
        available: true,
        channel: "push",
        description: "Requests and repayments",
        enabled: true,
        key: "financing",
        mandatory: false,
        title: "Financing",
      },
      {
        available: true,
        channel: "push",
        description: "Announcements and reminders",
        enabled: true,
        key: "cooperative",
        mandatory: false,
        title: "Cooperative updates",
      },
      {
        available: true,
        channel: "push",
        description: "Replies to your requests",
        enabled: true,
        key: "support",
        mandatory: false,
        title: "Support",
      },
    ],
    pushRegistration: null,
    summary: {
      enabledPreferences: 3,
      failed: 1,
      queued: 1,
      sent: 1,
      totalDeliveries: deliveries.length,
    },
  })
}

export function getDevAdminAccess(): MobileAdminAccess {
  return clone({
    generatedAt,
    roles: [
      {
        defaultUsersCount: 1,
        label: "Cooperative Admin",
        role: "tenant_admin",
        scope: "All cooperative administration and role assignment",
        usersCount: 2,
      },
      {
        defaultUsersCount: 1,
        label: "Finance Officer",
        role: "finance_officer",
        scope: "Receipts, financing, ledgers, and reports",
        usersCount: 2,
      },
      {
        defaultUsersCount: 0,
        label: "Operations Officer",
        role: "operations_officer",
        scope: "Members, procurement, food purchase, and support",
        usersCount: 1,
      },
      {
        defaultUsersCount: 38,
        label: "Member",
        role: "member",
        scope: "Own cooperative member records",
        usersCount: 38,
      },
    ],
    summary: {
      defaultRoles: 43,
      memberUsers: 38,
      roleAssignments: 43,
      staffUsers: 5,
      workspaceUsers: 43,
    },
    users: [
      {
        defaultRoleLabel: "Cooperative Admin",
        email: "admin@halaalvest.test",
        fullName: "Amina Bello",
        id: "admin_demo",
        isPlatformOwner: false,
        memberships: [
          {
            id: "membership-admin-dev",
            isDefault: true,
            label: "Cooperative Admin",
            role: "tenant_admin",
          },
        ],
      },
      {
        defaultRoleLabel: "Finance Officer",
        email: "zainab.finance@halaalvest.test",
        fullName: "Zainab Bello",
        id: "staff-dev-2",
        isPlatformOwner: false,
        memberships: [
          {
            id: "membership-finance-dev",
            isDefault: true,
            label: "Finance Officer",
            role: "finance_officer",
          },
        ],
      },
    ],
  })
}

export function inviteDevAdminAccess(
  input: MobileAdminAccessInviteInput
): AdminAccessInviteResult {
  return {
    cooperativeNumber: "HAL-S-ZAINAB01",
    deliveryStatus: "development_fixture",
    email: input.email,
    fullName: input.fullName,
    id: nextId("invite"),
    role: input.role,
    setupUrl: `halaalvest://recovery?cooperativeNumber=HAL-S-ZAINAB01&email=${encodeURIComponent(input.email)}`,
    status: "invited",
  }
}

export function recordDevCollectionFollowUp(
  input: MobileAdminCollectionFollowUpInput
): MobileAdminActionResult {
  return { id: input.repaymentScheduleItemId, status: input.status }
}

export function devActionResult(
  id: string,
  status: string
): MobileAdminActionResult {
  return { id, status }
}

export function devReceiptReview(
  id: string,
  status: string
): MobilePaymentReceipt {
  const receipt = receipts.find((item) => item.id === id) ?? receipts[0]!
  const updated = {
    ...receipt,
    reviewNotes: "Reviewed in the development workspace.",
    status,
  }
  receipts = receipts.map((item) => (item.id === updated.id ? updated : item))
  return clone(updated)
}

export function devProcurementReview(
  id: string,
  status: string
): MobileMemberProcurementRequest {
  const request =
    procurementRequests.find((item) => item.id === id) ??
    procurementRequests[0]!
  return clone({ ...request, status })
}

export function devFoodReview(
  id: string,
  status: string
): MobileFoodPurchaseApplication {
  const application =
    foodApplications.find((item) => item.id === id) ?? foodApplications[0]!
  return clone({ ...application, status })
}

export function devProjectReview(
  id: string,
  status: string
): MobileProjectFinancingRequest {
  const request =
    projectRequests.find((item) => item.id === id) ?? projectRequests[0]!
  return clone({ ...request, status })
}

export function devShareReview(id: string, decision: "approved" | "rejected") {
  const application =
    shareApplications.find((item) => item.id === id) ?? shareApplications[0]!
  const updated = {
    ...application,
    approvedUnits: decision === "approved" ? application.requestedUnits : null,
    reviewedAt: new Date().toISOString(),
    reviewNotes: "Reviewed in the development workspace.",
    status: decision,
  }
  shareApplications = shareApplications.map((item) =>
    item.id === updated.id ? updated : item
  )
  return clone(updated)
}
