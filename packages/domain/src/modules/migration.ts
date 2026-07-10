export type InitialMigrationStatus =
  | "not_started"
  | "historical_setup_in_progress"
  | "member_migration_in_progress"
  | "migration_review"
  | "finalized"
  | "live_operations"

export type InitialMigrationStepKey =
  | "finance_start_date"
  | "charge_schedules"
  | "business_profit_pools"
  | "business_profit_seasons"
  | "share_capital_plan"
  | "member_profiles"
  | "legacy_loans"
  | "member_ledger_backfill"
  | "finalization"

export type InitialMigrationStep = {
  complete: boolean
  key: InitialMigrationStepKey
  label: string
}

export type InitialMigrationSnapshot = {
  canUseLiveFinancialWrites: boolean
  canUseMigrationTools: boolean
  completedStepCount: number
  emergencyUnlockActive: boolean
  missingStepKeys: InitialMigrationStepKey[]
  status: InitialMigrationStatus
  steps: InitialMigrationStep[]
  totalStepCount: number
}

export function buildInitialMigrationSnapshot(input: {
  emergencyUnlockActive?: boolean
  hasBusinessProfitPools: boolean
  hasBusinessProfitSeasons?: boolean
  hasChargeSchedules: boolean
  hasFinalizationConfirmed: boolean
  hasFinanceStartDate: boolean
  hasLegacyLoansReviewed: boolean
  hasMemberLedgerBackfill: boolean
  hasMemberProfiles: boolean
  hasShareCapitalPlan: boolean
  requiresShareCapitalPlan?: boolean
  status: InitialMigrationStatus
}): InitialMigrationSnapshot {
  const shareCapitalPlanComplete =
    input.requiresShareCapitalPlan === false || input.hasShareCapitalPlan
  const steps: InitialMigrationStep[] = [
    {
      complete: input.hasFinanceStartDate,
      key: "finance_start_date",
      label: "Finance start date",
    },
    {
      complete: input.hasChargeSchedules,
      key: "charge_schedules",
      label: "Charge schedules",
    },
    {
      complete: input.hasBusinessProfitPools,
      key: "business_profit_pools",
      label: "Business profit pools or no-profit review",
    },
    {
      complete: input.hasBusinessProfitSeasons ?? true,
      key: "business_profit_seasons",
      label: "Business profit sharing seasons",
    },
    {
      complete: shareCapitalPlanComplete,
      key: "share_capital_plan",
      label:
        input.requiresShareCapitalPlan === false
          ? "Share capital plan (optional)"
          : "Share capital plan",
    },
    {
      complete: input.hasMemberProfiles,
      key: "member_profiles",
      label: "Member profiles",
    },
    {
      complete: input.hasLegacyLoansReviewed,
      key: "legacy_loans",
      label: "Legacy loans",
    },
    {
      complete: input.hasMemberLedgerBackfill,
      key: "member_ledger_backfill",
      label: "Member ledger backfill",
    },
    {
      complete: input.hasFinalizationConfirmed,
      key: "finalization",
      label: "Migration finalization",
    },
  ]
  const missingStepKeys = steps
    .filter((step) => !step.complete)
    .map((step) => step.key)
  const terminalStatus =
    input.status === "finalized" || input.status === "live_operations"
  const emergencyUnlockActive = input.emergencyUnlockActive ?? false

  return {
    canUseLiveFinancialWrites:
      input.status === "finalized" || input.status === "live_operations",
    canUseMigrationTools: !terminalStatus || emergencyUnlockActive,
    completedStepCount: steps.length - missingStepKeys.length,
    emergencyUnlockActive,
    missingStepKeys,
    status: input.status,
    steps,
    totalStepCount: steps.length,
  }
}
