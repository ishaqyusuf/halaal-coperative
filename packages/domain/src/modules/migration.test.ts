import { describe, expect, test } from "bun:test"
import { buildInitialMigrationSnapshot } from "./migration"

describe("initial migration lifecycle", () => {
  test("keeps migration tools available before finalization", () => {
    const snapshot = buildInitialMigrationSnapshot({
      hasBusinessProfitPools: false,
      hasChargeSchedules: true,
      hasFinalizationConfirmed: false,
      hasFinanceStartDate: true,
      hasLegacyLoansReviewed: false,
      hasMemberLedgerBackfill: false,
      hasMemberProfiles: false,
      hasShareCapitalPlan: true,
      status: "historical_setup_in_progress",
    })

    expect(snapshot.canUseMigrationTools).toBe(true)
    expect(snapshot.canUseLiveFinancialWrites).toBe(false)
    expect(snapshot.missingStepKeys).toEqual([
      "business_profit_pools",
      "member_profiles",
      "legacy_loans",
      "member_ledger_backfill",
      "finalization",
    ])
  })

  test("locks migration tools in live operations", () => {
    const snapshot = buildInitialMigrationSnapshot({
      hasBusinessProfitPools: true,
      hasChargeSchedules: true,
      hasFinalizationConfirmed: true,
      hasFinanceStartDate: true,
      hasLegacyLoansReviewed: true,
      hasMemberLedgerBackfill: true,
      hasMemberProfiles: true,
      hasShareCapitalPlan: true,
      status: "live_operations",
    })

    expect(snapshot.canUseMigrationTools).toBe(false)
    expect(snapshot.canUseLiveFinancialWrites).toBe(true)
    expect(snapshot.missingStepKeys).toEqual([])
  })

  test("opens live writes and allows audited emergency unlock after finalization", () => {
    const snapshot = buildInitialMigrationSnapshot({
      emergencyUnlockActive: true,
      hasBusinessProfitPools: true,
      hasChargeSchedules: true,
      hasFinalizationConfirmed: true,
      hasFinanceStartDate: true,
      hasLegacyLoansReviewed: true,
      hasMemberLedgerBackfill: true,
      hasMemberProfiles: true,
      hasShareCapitalPlan: true,
      status: "finalized",
    })

    expect(snapshot.canUseMigrationTools).toBe(true)
    expect(snapshot.canUseLiveFinancialWrites).toBe(true)
  })
})
