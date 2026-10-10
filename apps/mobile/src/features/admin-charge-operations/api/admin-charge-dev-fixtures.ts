import type {
  ChargeApplicationDetail,
  ChargeCommandResult,
  ChargeFilters,
  ChargeFormOptions,
  ChargeLane,
  ChargeWorkspace,
} from "../model/admin-charge-operations-types"

const generatedAt = "2026-08-30T19:20:00.000Z"

const applications = [
  {
    amount: 12_000,
    assessedAt: "2026-08-22T09:00:00.000Z",
    collectionMode: "pay_separately" as const,
    definitionCode: "LOAN-PROCESS",
    definitionName: "Loan processing",
    id: "charge-dev-aisha",
    isMonthlyLevy: false,
    memberId: "member-dev-aisha",
    memberName: "Aisha Bello",
    memberNumber: "HVC-QA-0041",
    periodLabel: "August 2026",
    purpose: "loan_fee",
    status: "pending" as const,
    trigger: "manual",
    workflow: "loan_request",
  },
  {
    amount: 5_000,
    assessedAt: "2026-08-01T08:00:00.000Z",
    collectionMode: "deduct_from_savings" as const,
    definitionCode: "MONTHLY-LEVY",
    definitionName: "Monthly levy",
    id: "charge-dev-maryam",
    isMonthlyLevy: true,
    memberId: "member-dev-maryam",
    memberName: "Maryam Sule",
    memberNumber: "HVC-QA-0044",
    periodLabel: "August 2026",
    purpose: "general",
    status: "posted" as const,
    trigger: "monthly_collection",
    workflow: "commitment_collection",
  },
  {
    amount: 7_500,
    assessedAt: "2026-08-14T11:30:00.000Z",
    collectionMode: "deduct_from_savings" as const,
    definitionCode: "PROCUREMENT-FEE",
    definitionName: "Procurement fee",
    id: "charge-dev-fatima",
    isMonthlyLevy: false,
    memberId: "member-dev-fatima",
    memberName: "Fatima Lawal",
    memberNumber: "HVC-QA-0040",
    periodLabel: "August 2026",
    purpose: "general",
    status: "reversed" as const,
    trigger: "submission",
    workflow: "procurement_request",
  },
]

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
  members: applications.map((row) => ({
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
  let rows = lane === "rules" ? rules : applications
  if (lane === "levies") rows = applications.filter((row) => row.isMonthlyLevy)
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
    return true
  })
  return {
    capabilities: { correct: true, manage: true, view: true },
    currencyCode: "NGN",
    data,
    generatedAt,
    lane,
    nextCursor: null,
    stats: { corrections: 2, outstanding: 42_000, postedThisMonth: 185_000 },
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
            postedAt: row.assessedAt,
            reference: null,
          },
    notes: "QA evidence retained for mobile charge operations.",
    target:
      row.workflow === "procurement_request"
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
      item.name.toLowerCase().includes(query)
    ),
    members: options.members.filter((item) =>
      `${item.fullName} ${item.memberNumber}`.toLowerCase().includes(query)
    ),
  }
}

export async function runDevChargeCommand(
  commandId: string,
  entityId: string,
  state: string
): Promise<ChargeCommandResult> {
  return { commandId, entityId, replayed: false, state }
}
