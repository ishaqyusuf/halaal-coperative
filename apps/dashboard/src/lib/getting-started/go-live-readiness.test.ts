import { describe, expect, test } from "bun:test"
import { buildInitialMigrationSnapshot } from "@halaalvest/domain"
import {
  formatMemberSignInHost,
  getGoLiveBannerMessage,
  getGoLiveConfirmationLabel,
  getGoLiveReadinessRows,
  goLiveSuccessHref,
  isReadyToGoLive,
} from "./go-live-readiness"

function snapshot(
  overrides: Partial<Parameters<typeof buildInitialMigrationSnapshot>[0]> = {}
) {
  return buildInitialMigrationSnapshot({
    hasBusinessProfitPools: true,
    hasBusinessProfitSeasons: true,
    hasChargeSchedules: true,
    hasFinalizationConfirmed: false,
    hasFinanceStartDate: true,
    hasLegacyLoansReviewed: true,
    hasMemberLedgerBackfill: true,
    hasMemberProfiles: true,
    hasMigrationSetupMode: true,
    hasShareCapitalPlan: true,
    status: "migration_review",
    ...overrides,
  })
}

describe("go-live readiness rows", () => {
  test("lists every check except finalization, in snapshot order, with a fix link", () => {
    const rows = getGoLiveReadinessRows(snapshot())

    expect(rows.map((row) => row.key)).toEqual([
      "migration_setup_mode",
      "finance_start_date",
      "charge_schedules",
      "business_profit_pools",
      "business_profit_seasons",
      "share_capital_plan",
      "member_profiles",
      "legacy_loans",
      "member_ledger_backfill",
    ])
    expect(rows.every((row) => row.ready)).toBe(true)
    expect(rows.every((row) => row.label.length > 0)).toBe(true)
  })

  test("maps each check to the page that fixes it", () => {
    const hrefs = Object.fromEntries(
      getGoLiveReadinessRows(snapshot()).map((row) => [row.key, row.fixHref])
    )

    expect(hrefs).toEqual({
      business_profit_pools: "/getting-started?step=profit",
      business_profit_seasons: "/getting-started?step=profit-seasons",
      charge_schedules: "/getting-started?step=shares-charges",
      finance_start_date: "/getting-started?step=setup-mode",
      legacy_loans: "/onboarding-success",
      member_ledger_backfill: "/onboarding-success",
      member_profiles: "/onboarding-success",
      migration_setup_mode: "/getting-started?step=setup-mode",
      share_capital_plan: "/getting-started?step=shares-charges",
    })
  })

  test("marks missing checks and blocks going live, including member backfill", () => {
    const blocked = snapshot({
      hasChargeSchedules: false,
      hasMemberLedgerBackfill: false,
    })
    const missing = getGoLiveReadinessRows(blocked)
      .filter((row) => !row.ready)
      .map((row) => row.key)

    expect(missing).toEqual(["charge_schedules", "member_ledger_backfill"])
    expect(isReadyToGoLive(blocked)).toBe(false)
  })

  test("only the pending finalization step still counts as ready", () => {
    const ready = snapshot()

    expect(ready.missingStepKeys).toEqual(["finalization"])
    expect(isReadyToGoLive(ready)).toBe(true)
  })
})

describe("go-live copy", () => {
  test("uses the cooperative name in the confirmation", () => {
    expect(getGoLiveConfirmationLabel("Amanah")).toBe(
      "I've checked the balances with our records. Start live operations for Amanah."
    )
  })

  test("builds the member sign-in host for subdomain and path tenants", () => {
    expect(formatMemberSignInHost({ host: "amanah.halaalvest.com" })).toBe(
      "amanah.halaalvest.com"
    )
    expect(
      formatMemberSignInHost({
        externalBasePath: "/amanah/",
        host: "halaalvest.com",
      })
    ).toBe("halaalvest.com/amanah")
    expect(formatMemberSignInHost({ host: "  " })).toBeNull()
  })

  test("writes the live banner with or without a host", () => {
    expect(
      getGoLiveBannerMessage({
        signInHost: "amanah.halaalvest.com",
        tenantName: "Amanah",
      })
    ).toBe(
      "Amanah is live. Members can sign in at amanah.halaalvest.com with their member code."
    )
    expect(
      getGoLiveBannerMessage({ signInHost: null, tenantName: "Amanah" })
    ).toBe("Amanah is live. Members can sign in with their member code.")
    expect(goLiveSuccessHref).toBe("/?live=1")
  })
})
