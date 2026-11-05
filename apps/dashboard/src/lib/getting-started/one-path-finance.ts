// Plain labels, small calculations and the save sequence shared by the One
// Path "Shares and charges" (step 7) and "Profit sharing" (step 8) screens.
// The stored values are unchanged; only what the owner reads is plain.

export type ChargeFrequencyValue =
  | "recurring_monthly"
  | "per_contribution"
  | "one_time"
  | "manual"

export const chargeWhenOptions = [
  { label: "Every month", value: "recurring_monthly" },
  { label: "With each payment", value: "per_contribution" },
  { label: "Once, when a member joins", value: "one_time" },
  { label: "Only when we apply it", value: "manual" },
] as const satisfies ReadonlyArray<{
  label: string
  value: ChargeFrequencyValue
}>

export function chargeWhenLabel(value: ChargeFrequencyValue) {
  return chargeWhenOptions.find((option) => option.value === value)!.label
}

export const chargeValueTypeOptions = [
  { label: "Fixed amount", value: "fixed_amount" },
  { label: "Percentage", value: "percentage" },
] as const

export const chargePurposeOptions = [
  { label: "General", value: "general" },
  { label: "Member share", value: "member_share" },
  { label: "Loan fee", value: "loan_fee" },
  { label: "Membership fee", value: "membership_fee" },
  { label: "Penalty", value: "penalty" },
] as const

export const chargeRequiredMessage =
  "Add at least one charge, for example a registration fee."

export type ShareConfigurationModeValue = "monthly_history" | "unit_based"

export const shareModelOptions = [
  {
    description:
      "Each member adds the same share amount with their monthly payment.",
    label: "A share amount every month",
    value: "monthly_history",
  },
  {
    description: "Members buy whole units at a set price, within limits.",
    label: "Members buy share units",
    value: "unit_based",
  },
] as const satisfies ReadonlyArray<{
  description: string
  label: string
  value: ShareConfigurationModeValue
}>

export const shareRuleOptions = [
  { label: "A fixed amount", value: "fixed_amount" },
  {
    label: "A percentage of what's left after charges",
    value: "percentage",
  },
] as const

export type ProfitDistributionFrequencyValue =
  | "annual"
  | "semi_annual"
  | "quarterly"
  | "ad_hoc"

export const profitFrequencyOptions = [
  { label: "Once a year", value: "annual" },
  { label: "Twice a year", value: "semi_annual" },
  { label: "Every quarter", value: "quarterly" },
  { label: "Whenever we decide", value: "ad_hoc" },
] as const satisfies ReadonlyArray<{
  label: string
  value: ProfitDistributionFrequencyValue
}>

export function profitFrequencyLabel(value: ProfitDistributionFrequencyValue) {
  return profitFrequencyOptions.find((option) => option.value === value)!.label
}

export type HistoricalProfitMigrationModeValue =
  | "manual_review_required"
  | "import_historical_profit_pools"
  | "no_historical_business_profit"

export const historicalProfitMigrationModeOptions = [
  {
    label: "We'll check past profits by hand",
    value: "manual_review_required",
  },
  {
    label: "Bring in our past business profits",
    value: "import_historical_profit_pools",
  },
  {
    label: "We had no business profit before",
    value: "no_historical_business_profit",
  },
] as const satisfies ReadonlyArray<{
  label: string
  value: HistoricalProfitMigrationModeValue
}>

export const defaultHistoricalProfitMigrationMode: HistoricalProfitMigrationModeValue =
  "manual_review_required"

export const financialYearStartMonthOptions = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
].map((label, index) => ({ label, value: String(index + 1) }))

// Basis and expense treatment each have exactly one stored option, so the
// screen states them as a fact and still sends both values.
export const profitSharingBasisFact =
  "Profit is shared by each member's share capital balance, after reviewed expenses."

export const profitPolicyFixedFields = {
  distributionBasis: "share_capital_balance",
  expenseTreatment: "deduct_reviewed_expenses_before_distribution",
} as const

function roundPercentage(value: number) {
  return Math.round(value * 100) / 100
}

function parsePercentage(value: string | undefined) {
  const trimmed = value?.trim() ?? ""

  if (!trimmed) {
    return null
  }

  const parsed = Number(trimmed)

  return Number.isFinite(parsed) ? parsed : null
}

// Editing "Shared with members %" fills "Kept in reserve %" with 100 − value.
// Returns null when the typed value cannot be split (blank, not a number, or
// outside 0–100), so the reserve keeps whatever the owner typed.
export function reserveForSharedPercentage(shared: string): string | null {
  const sharedValue = parsePercentage(shared)

  if (sharedValue === null || sharedValue < 0 || sharedValue > 100) {
    return null
  }

  return String(roundPercentage(100 - sharedValue))
}

export type ProfitSplitSummary = {
  isComplete: boolean
  message: string
  reservePercent: number
  sharedPercent: number
  total: number
}

export function summarizeProfitSplit(
  shared: string,
  reserve: string | undefined
): ProfitSplitSummary {
  const sharedPercent = parsePercentage(shared) ?? 0
  const reservePercent = parsePercentage(reserve) ?? 0
  const total = roundPercentage(sharedPercent + reservePercent)
  const isComplete = total === 100

  return {
    isComplete,
    message: isComplete
      ? "Adds up to 100%"
      : `Adds up to ${total}%. It needs to be 100%.`,
    reservePercent,
    sharedPercent,
    total,
  }
}

export type OnePathProfitPolicyValues = {
  defaultDistributablePercentage: string
  financialYearStartMonth: string
  historicalProfitMigrationMode: HistoricalProfitMigrationModeValue
  profitDistributionFrequency: ProfitDistributionFrequencyValue
  requiresProfitDistributionApproval: boolean
  reserveRetentionPercentage?: string
}

// Every field `updateTenantBusinessProfitPolicyAction` reads. The approval
// flag is sent as an explicit "true"/"false" because a missing value means
// false on the server.
export function buildProfitPolicyPayload(values: OnePathProfitPolicyValues) {
  return {
    defaultDistributablePercentage:
      values.defaultDistributablePercentage.trim(),
    distributionBasis: profitPolicyFixedFields.distributionBasis,
    expenseTreatment: profitPolicyFixedFields.expenseTreatment,
    financialYearStartMonth: values.financialYearStartMonth,
    historicalProfitMigrationMode: values.historicalProfitMigrationMode,
    profitDistributionFrequency: values.profitDistributionFrequency,
    requiresProfitDistributionApproval:
      values.requiresProfitDistributionApproval ? "true" : "false",
    reserveRetentionPercentage:
      values.reserveRetentionPercentage?.trim() || "0",
  }
}

// The first dated row of a charge or a monthly share amount may be left
// without a date when the screen shows a default (today in brought-forward
// mode). Fill it only when the row has an amount, so an untouched row never
// counts as started.
export function fillFirstRowEffectiveFrom<
  TRow extends { amount: string; effectiveFrom: string },
>(rows: TRow[], effectiveFrom: string | null): TRow[] {
  if (!effectiveFrom || rows.length === 0) {
    return rows
  }

  const [firstRow, ...otherRows] = rows

  if (!firstRow || !firstRow.amount || firstRow.effectiveFrom) {
    return rows
  }

  return [{ ...firstRow, effectiveFrom }, ...otherRows]
}

// The default "from" date shown for a new charge or share amount: the setup
// date (today) in brought-forward mode, never before the cooperative start.
export function resolveDefaultEffectiveFrom({
  financeStartDate,
  today,
}: {
  financeStartDate: string | null | undefined
  today: string
}) {
  return financeStartDate && financeStartDate > today ? financeStartDate : today
}

export const profitSeasonStatusLabels = {
  approved: "Approved",
  closed: "Closed",
  draft: "Draft",
  pending: "Needs review",
  published: "Shared",
} as const satisfies Record<
  "pending" | "draft" | "approved" | "published" | "closed",
  string
>

// One primary action per step: every section validates first (stopping at
// the first problem, which that section reports), then the saves run in the
// order the server needs. Nothing is saved when any section is invalid.
export type OnePathSaveTask = () => Promise<void>
export type OnePathSavePreparer = () =>
  | OnePathSaveTask
  | null
  | Promise<OnePathSaveTask | null>

export async function prepareOnePathSaves(
  preparers: OnePathSavePreparer[]
): Promise<OnePathSaveTask[] | null> {
  const tasks: OnePathSaveTask[] = []

  for (const prepare of preparers) {
    const task = await prepare()

    if (!task) {
      return null
    }

    tasks.push(task)
  }

  return tasks
}

export async function runOnePathSaves(tasks: OnePathSaveTask[]) {
  for (const task of tasks) {
    await task()
  }
}
