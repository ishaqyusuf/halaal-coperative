"use client"

type FieldValues = Record<string, unknown>

type DashboardFormReset<TFieldValues> = {
  reset: (values?: TFieldValues) => void
}

const dashboardDevFormDefaults = {
  audit_filters: {
    action: "loan_request",
    from: "2026-04-01",
    search: "approved",
    to: "2026-04-14",
  },
  charge_application: {
    amount: "2500",
    assessedAt: "2026-04-14",
    chargeDefinitionId: "",
    memberId: "",
    notes: "Monthly levy for April cycle",
  },
  charge_definition: {
    amount: "2500",
    appliesToLoanRequests: false,
    appliesToLoans: false,
    appliesToMembers: true,
    code: "LEVY-APR",
    isMonthlyLevy: true,
    kind: "fixed",
    name: "Monthly Levy",
  },
  contribution_plan: {
    amount: "25000",
    memberId: "",
    name: "Monthly commitment",
    startsAt: "2026-04-01",
  },
  cooperative_profile: {
    currentSize: "125",
    name: "Noor Cooperative Society",
    officeAddress: "12 Emir Road, Kaduna North, Kaduna State",
    region: "Kaduna",
    startDate: "2019-03-15",
    timezone: "Africa/Lagos",
  },
  custom_domain: {
    hostname: "coop.example.org",
  },
  loan_request: {
    extraMonthlySavingsAmount: "5000",
    loanProductId: "",
    memberId: "",
    purpose: "Education support",
    requestedAmount: "150000",
    requestedTermMonths: "12",
  },
  member_create: {
    fullName: "Amina Yusuf",
    joinedAt: "2026-04-14",
    memberNumber: "MEM-1024",
    memberType: "individual",
  },
  member_signup: {
    confirmPassword: "password123",
    email: "amina.yusuf@example.com",
    fullName: "Amina Yusuf",
    memberNumber: "MEM-1024",
    password: "password123",
    phoneNumber: "+234 800 000 0000",
  },
  member_kyc: {
    governmentIdNumber: "NIN-12345678901",
    kycDocumentType: "National ID",
    kycDocumentUrl: "https://example.com/kyc/aminateam.pdf",
    kycReviewNotes: "Identity document received and awaiting final review.",
    kycStatus: "pending",
    memberId: "",
  },
  member_payment: {
    channel: "transfer",
    committedSavingsAmount: "25000",
    contributionPlanId: "",
    extraLoanPaymentAmount: "5000",
    extraSavingsAmount: "5000",
    loanId: "",
    memberId: "",
    periodLabel: "April 2026",
    postedAt: "2026-04-14",
    reference: "TRX-APR-001",
    scheduledLoanServicingAmount: "15000",
    totalAmount: "50000",
  },
  repayment_post: {
    amount: "25000",
    loanId: "",
    reference: "PMT-001",
    repaymentScheduleItemId: "",
  },
  role_assignment: {
    email: "amina@coop.org",
    fullName: "Amina Yusuf",
    makeDefault: true,
    role: "member",
  },
} as const

export type DashboardDevFormKind = keyof typeof dashboardDevFormDefaults

export function applyDashboardDevFormFill<TFieldValues extends FieldValues>(
  form: DashboardFormReset<TFieldValues>,
  kind: DashboardDevFormKind,
  overrides?: Partial<TFieldValues>,
) {
  form.reset(({
    ...dashboardDevFormDefaults[kind],
    ...overrides,
  } as unknown) as TFieldValues)
}
