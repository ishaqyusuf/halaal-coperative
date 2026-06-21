"use client"

type FieldValues = Record<string, unknown>

type DashboardFormReset<TFieldValues> = {
  reset: (values?: TFieldValues) => void
}

function randomItem<TValue>(items: readonly TValue[]) {
  return items[Math.floor(Math.random() * items.length)]!
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function randomRecentDate(yearStart: number, yearEnd: number) {
  return formatDate(randomInt(yearStart, yearEnd), randomInt(1, 12), randomInt(1, 28))
}

const memberFirstNames = ["Amina", "Zainab", "Fatima", "Maryam", "Khadija", "Hauwa", "Musa", "Ibrahim", "Yusuf", "Sadiq"]
const memberLastNames = ["Yusuf", "Bello", "Garba", "Muhammad", "Sule", "Usman", "Abdullahi", "Ilyas", "Kabir", "Lawal"]
const memberTypes = ["individual", "civil_servant", "business"] as const

function createRandomMemberCreateDefaults() {
  const fullName = `${randomItem(memberFirstNames)} ${randomItem(memberLastNames)}`
  const memberNumber = String(randomInt(1000, 9999))
  const joinedAt = randomRecentDate(2021, 2026)
  const monthlyCommitment = String(randomItem([10000, 15000, 20000, 25000, 30000, 50000]))
  const currentSavingsBalance = String(randomItem([0, 15000, 45000, 80000, 125000, 250000]))
  const hasServingLoan = Math.random() >= 0.5
  const email = `${fullName.toLowerCase().replace(/\s+/g, ".")}@example.com`
  const profileDefaults = {
    address: `${randomInt(1, 48)} Cooperative Road, Kaduna`,
    email,
    occupation: randomItem(["Trader", "Teacher", "Civil servant", "Business owner", "Tailor"]),
    phoneNumber: `+23480${randomInt(10000000, 99999999)}`,
  }

  if (!hasServingLoan) {
    return {
      ...profileDefaults,
      currentSavingsBalance,
      fullName,
      hasServingLoan,
      joinedAt,
      loanAmount: "",
      loanMonthlyCommitment: "",
      loanPaymentMonths: "",
      loanServed: "",
      loanStartDate: "",
      loanTopupAmount: "",
      monthlyCommitment,
      memberNumber,
      memberType: randomItem(memberTypes),
    }
  }

  const loanAmount = randomItem([150000, 250000, 350000, 500000, 750000, 1000000])
  const maxServedSteps = Math.max(0, Math.floor(loanAmount / 50000) - 1)
  const loanServed = maxServedSteps > 0 ? randomInt(0, maxServedSteps) * 50000 : 0
  const loanPaymentMonths = randomItem([6, 9, 12, 18, 24])
  const loanMonthlyCommitment = Number(((loanAmount - loanServed) / loanPaymentMonths).toFixed(2))
  const loanTopupAmount = randomItem([0, 5000, 10000, 15000, 25000])

  return {
    ...profileDefaults,
    currentSavingsBalance,
    fullName,
    hasServingLoan,
    joinedAt,
    loanAmount: String(loanAmount),
    loanMonthlyCommitment: String(loanMonthlyCommitment),
    loanPaymentMonths: String(loanPaymentMonths),
    loanServed: String(loanServed),
    loanStartDate: randomRecentDate(2022, 2026),
    loanTopupAmount: String(loanTopupAmount),
    monthlyCommitment,
    memberNumber,
    memberType: randomItem(memberTypes),
  }
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
    effectiveFrom: "2026-04-01",
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
    memberNumberPrefix: "MEM-",
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
    address: "12 Cooperative Road, Kaduna",
    email: "amina.yusuf@example.com",
    fullName: "Amina Yusuf",
    joinedAt: "2026-04-14",
    loanTopupAmount: "",
    memberNumber: "1024",
    memberType: "individual",
    occupation: "Trader",
    phoneNumber: "+234 800 000 0000",
  },
  member_signup: {
    confirmPassword: "password123",
    email: "amina.yusuf@example.com",
    fullName: "Amina Yusuf",
    memberNumber: "1024",
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

export function getDashboardRandomDevFormFill<TFieldValues extends FieldValues>(kind: DashboardDevFormKind) {
  if (kind === "member_create") {
    return createRandomMemberCreateDefaults() as unknown as TFieldValues
  }

  return dashboardDevFormDefaults[kind] as unknown as TFieldValues
}

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

export function applyDashboardRandomDevFormFill<TFieldValues extends FieldValues>(
  form: DashboardFormReset<TFieldValues>,
  kind: DashboardDevFormKind,
  overrides?: Partial<TFieldValues>,
) {
  form.reset(({
    ...getDashboardRandomDevFormFill<TFieldValues>(kind),
    ...overrides,
  } as unknown) as TFieldValues)
}
