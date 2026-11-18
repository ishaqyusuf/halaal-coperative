import type {
  ChargeApplicationDetail,
  ChargeApplicationRow,
  ChargeCommandResult,
  ChargeFilters,
  ChargeFormOptions,
  ChargeLane,
  ChargeWorkspace,
} from "../model/admin-charge-operations-types"

const generatedAt = "2026-11-17T09:12:00.000Z"

const applications: ChargeApplicationRow[] = [
  {
    amount: 12_000,
    assessedAt: "2026-11-17T09:12:00.000Z",
    collectionMode: "pay_separately" as const,
    definitionCode: "LOAN-PROCESS",
    definitionName: "Loan processing",
    id: "charge-dev-aisha",
    isMonthlyLevy: false,
    memberId: "member-dev-aisha",
    memberName: "Aisha Bello",
    memberNumber: "QHC-0042",
    periodLabel: "November 2026",
    purpose: "loan_fee",
    status: "pending" as const,
    trigger: "manual",
    workflow: "loan_request",
  },
  {
    amount: 5_000,
    assessedAt: "2026-11-01T08:00:00.000Z",
    collectionMode: "deduct_from_savings" as const,
    definitionCode: "MONTHLY-LEVY",
    definitionName: "Monthly levy",
    id: "charge-dev-maryam",
    isMonthlyLevy: true,
    memberId: "member-dev-maryam",
    memberName: "Maryam Sule",
    memberNumber: "QHC-0044",
    periodLabel: "November 2026",
    purpose: "general",
    status: "posted" as const,
    trigger: "monthly_collection",
    workflow: "commitment_collection",
  },
  {
    amount: 7_500,
    assessedAt: "2026-11-14T11:30:00.000Z",
    collectionMode: "deduct_from_savings" as const,
    definitionCode: "PROCUREMENT-FEE",
    definitionName: "Procurement fee",
    id: "charge-dev-fatima",
    isMonthlyLevy: false,
    memberId: "member-dev-fatima",
    memberName: "Fatima Lawal",
    memberNumber: "QHC-0040",
    periodLabel: "November 2026",
    purpose: "general",
    status: "reversed" as const,
    trigger: "submission",
    workflow: "procurement_request",
  },
]

const applicationExamples = [
  ["Khadija Sanni", "0051", 2500, "Late payment penalty", "posted", 17],
  ["Ibrahim Yusuf", "0007", 10000, "Membership fee", "pending", 16],
  ["Musa Abdullahi", "0026", 7500, "Procurement fee", "posted", 16],
  ["Zainab Ahmed", "0085", 2500, "Late payment penalty", "waived", 14],
  ["Usman Garba", "0069", 20000, "Loan processing", "pending", 13],
  ["Hauwa Musa", "0077", 10000, "Membership fee", "posted", 12],
  ["Sadiq Bello", "0102", 4500, "Procurement fee", "posted", 12],
  ["Amina Yakubu", "0093", 2500, "Late payment penalty", "posted", 11],
  ["Abubakar Danjuma", "0118", 10000, "Membership fee", "waived", 8],
  ["Halima Idris", "0131", 2500, "Late payment penalty", "posted", 6],
  ["Yusuf Lawal", "0145", 6000, "Procurement fee", "posted", 5],
] as const
for (const [name, number, amount, charge, status, day] of applicationExamples) {
  const assessedAt = `2026-11-${String(day).padStart(2, "0")}T08:40:00.000Z`
  applications.push({
    ...applications[0]!,
    amount,
    assessedAt,
    definitionName: charge,
    definitionCode:
      charge === "Loan processing"
        ? "LOAN-PROCESS"
        : charge.toUpperCase().replaceAll(" ", "-"),
    id: `charge-dev-${number}`,
    memberId: `member-dev-${number}`,
    memberName: name,
    memberNumber: `QHC-${number}`,
    status,
  })
  applications.push({
    ...applications[1]!,
    id: `levy-dev-${number}`,
    memberId: `member-dev-${number}`,
    memberName: name,
    memberNumber: `QHC-${number}`,
    status: day % 3 === 0 ? "pending" : "posted",
  })
}
applications.sort(
  (left, right) =>
    new Date(right.assessedAt).getTime() - new Date(left.assessedAt).getTime()
)

const rules = [
  {
    applicability: [
      {
        collectionMode: "deduct_from_savings" as const,
        id: "applicability-monthly",
        isActive: true,
        isRequired: true,
        trigger: "monthly_collection",
        workflow: "commitment_collection",
      },
    ],
    chargeFrequency: "recurring_monthly",
    chargeValueType: "fixed_amount" as const,
    code: "MONTHLY-LEVY",
    id: "definition-monthly",
    isActive: true,
    isMonthlyLevy: true,
    name: "Monthly levy",
    purpose: "general",
    versions: [
      {
        amount: 5_000,
        chargeValueType: "fixed_amount" as const,
        effectiveFrom: "2026-08-01T00:00:00.000Z",
        id: "version-monthly-aug",
      },
    ],
  },
  {
    applicability: [
      {
        collectionMode: "pay_separately" as const,
        id: "applicability-loan",
        isActive: true,
        isRequired: true,
        trigger: "manual",
        workflow: "loan_request",
      },
    ],
    chargeFrequency: "manual",
    chargeValueType: "percentage" as const,
    code: "LOAN-PROCESS",
    id: "definition-loan",
    isActive: true,
    isMonthlyLevy: false,
    name: "Loan processing",
    purpose: "loan_fee",
    versions: [
      {
        amount: 2,
        chargeValueType: "percentage" as const,
        effectiveFrom: "2026-08-01T00:00:00.000Z",
        id: "version-loan-aug",
      },
    ],
  },
]

const options: ChargeFormOptions = {
  definitions: rules.map((rule) => ({
    chargeFrequency: rule.chargeFrequency,
    chargeValueType: rule.chargeValueType,
    code: rule.code,
    collectionMode: rule.applicability[0]!.collectionMode,
    id: rule.id,
    isMonthlyLevy: rule.isMonthlyLevy,
    name: rule.name,
    purpose: rule.purpose,
    rate: rule.versions[0]!.amount,
  })),
  members: [
    ...new Map(applications.map((row) => [row.memberId, row])).values(),
  ].map((row) => ({
    fullName: row.memberName,
    id: row.memberId,
    memberNumber: row.memberNumber,
    status: "active",
  })),
}

export async function getDevChargeWorkspace(
  lane: ChargeLane,
  search?: string,
  filters?: ChargeFilters
): Promise<ChargeWorkspace> {
  const rows =
    lane === "rules"
      ? rules
      : applications.filter((row) => row.isMonthlyLevy === (lane === "levies"))
  const query = search?.toLowerCase()
  const data = rows.filter((row) => {
    if (query && !JSON.stringify(row).toLowerCase().includes(query))
      return false
    if ("status" in row && filters?.status && row.status !== filters.status)
      return false
    if (
      "collectionMode" in row &&
      filters?.collectionMode &&
      row.collectionMode !== filters.collectionMode
    )
      return false
    if (filters?.purpose && row.purpose !== filters.purpose) return false
    if ("assessedAt" in row) {
      if (
        filters?.fromDate &&
        new Date(row.assessedAt) < new Date(filters.fromDate)
      )
        return false
      if (
        filters?.toDate &&
        new Date(row.assessedAt) >= new Date(filters.toDate)
      )
        return false
    }
    if (
      "applicability" in row &&
      filters?.workflow &&
      !row.applicability.some((item) => item.workflow === filters.workflow)
    )
      return false
    return true
  })
  return {
    capabilities: { correct: true, manage: true, view: true },
    currencyCode: "NGN",
    data,
    generatedAt,
    lane,
    nextCursor: null,
    stats: { corrections: 3, outstanding: 61_000, postedThisMonth: 214_000 },
  } as ChargeWorkspace
}

export async function getDevChargeApplication(
  applicationId: string
): Promise<ChargeApplicationDetail> {
  const row =
    applications.find((item) => item.id === applicationId) ?? applications[0]!
  const rule =
    rules.find((item) => item.code === row.definitionCode) ?? rules[0]!
  return {
    ...row,
    amountBasis: rule.chargeValueType === "percentage" ? 600_000 : null,
    audit: [
      {
        action: row.status === "pending" ? "charge.staged" : "charge.applied",
        actorUserId: "qa-user",
        id: `audit-${row.id}`,
        metadata: { amount: row.amount, collectionMode: row.collectionMode },
        occurredAt: row.assessedAt,
      },
    ],
    definition: {
      chargeFrequency: rule.chargeFrequency,
      chargeValueType: rule.chargeValueType,
      code: rule.code,
      effectiveAmount: rule.versions[0]!.amount,
      isMonthlyLevy: rule.isMonthlyLevy,
      name: rule.name,
      purpose: rule.purpose,
      versionEffectiveFrom: rule.versions[0]!.effectiveFrom,
      versionId: rule.versions[0]!.id,
    },
    ledger:
      row.status === "pending"
        ? null
        : {
            entries: [
              {
                accountCode: "1000",
                accountName: "Member Savings",
                amount: row.amount,
                direction: "debit",
              },
              {
                accountCode: row.isMonthlyLevy ? "3100" : "3000",
                accountName: row.isMonthlyLevy
                  ? "Levy Income"
                  : "Charge Income",
                amount: row.amount,
                direction: "credit",
              },
            ],
            id: `ledger-${row.id}`,
            postedAt: new Date(row.assessedAt).toISOString(),
            reference: null,
          },
    notes: "QA evidence retained for mobile charge operations.",
    target:
      row.id === "charge-dev-aisha"
        ? {
            id: "loan-qa",
            label: "Loan request LR-2026-118",
            state: "under_review",
            type: "loan_request",
          }
        : row.workflow === "procurement_request"
          ? {
              id: "procurement-qa",
              label: "Equipment request",
              state: "approved",
              type: "procurement_request",
            }
          : null,
    workspaceState: row.status,
  }
}

export async function getDevChargeFormOptions(search?: string) {
  const query = search?.toLowerCase()
  if (!query) return options
  return {
    definitions: options.definitions.filter((item) =>
      `${item.name} ${item.code}`.toLowerCase().includes(query)
    ),
    members: options.members.filter((item) =>
      `${item.fullName} ${item.memberNumber}`.toLowerCase().includes(query)
    ),
  }
}

const commands = new Map<string, ChargeCommandResult>()

export async function runDevChargeCommand(
  commandId: string,
  entityId: string,
  state: string
): Promise<ChargeCommandResult> {
  const existing = commands.get(commandId)
  if (existing) return { ...existing, replayed: true }
  const result = { commandId, entityId, replayed: false, state }
  commands.set(commandId, result)
  return result
}
