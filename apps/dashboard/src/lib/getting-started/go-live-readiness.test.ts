import { describe, expect, test } from "bun:test"
import { buildInitialMigrationSnapshot } from "@halaalvest/domain"
import type { GoLiveFinancingReadiness } from "@halaalvest/db"
import {
  formatMemberSignInHost,
  getGoLiveBannerMessage,
  getGoLiveConfirmationLabel,
  getGoLiveFinancingSummary,
  getGoLiveReadinessRows,
  getOwnerKycReadinessRow,
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

describe("owner KYC on the go-live checklist", () => {
  const owner = (
    kycStatus: "not_started" | "pending" | "rejected" | "verified"
  ) => ({ fullName: "Zainab Musa", id: "member-1", kycStatus })

  test("adds a Your KYC row after the snapshot rows, linked to the KYC sheet", () => {
    const rows = getGoLiveReadinessRows(snapshot(), {
      owner: owner("not_started"),
    })

    expect(rows.at(-1)).toEqual({
      fixHref: "/members/member-1?memberDetailSheetType=kyc",
      key: "owner_kyc",
      label: "Your KYC",
      ready: false,
    })
  })

  test("blocks going live until the owner's KYC is verified", () => {
    expect(isReadyToGoLive(snapshot(), { owner: owner("pending") })).toBe(false)
    expect(isReadyToGoLive(snapshot(), { owner: null })).toBe(false)
    expect(isReadyToGoLive(snapshot(), { owner: owner("verified") })).toBe(true)
  })

  test("sends an owner without a member record back to step 10", () => {
    expect(getOwnerKycReadinessRow(null)).toMatchObject({
      fixHref: "/onboarding-success",
      ready: false,
    })
  })
})

describe("go-live financing summary", () => {
  const product = (
    loanType: "normal" | "quick",
    overrides: Partial<GoLiveFinancingReadiness["products"]["quick"]> = {}
  ) => ({
    exists: false,
    isActive: true,
    loanType,
    maxSavingsMultiple: 2,
    name: loanType === "quick" ? "Quick financing" : "Normal financing",
    termMonths: loanType === "quick" ? 3 : 18,
    willCreate: true,
    ...overrides,
  })
  const financing = (
    cycle: Partial<GoLiveFinancingReadiness["cycle"]> = {}
  ): GoLiveFinancingReadiness => ({
    cycle: {
      canOpenAtGoLive: true,
      periodEnd: "2026-11-30",
      periodStart: "2026-11-01",
      projectedCommitmentAmount: 120_000,
      reserveBufferAmount: 0,
      status: null,
      totalCapacityAmount: 120_000,
      ...cycle,
    },
    products: { normal: product("normal"), quick: product("quick") },
  })

  test("offers to open this month's financing when there is capacity", () => {
    const summary = getGoLiveFinancingSummary(financing())

    expect(summary.canOpenCycle).toBe(true)
    expect(summary.cycleLabel).toBe("Open November 2026 financing now")
    expect(summary.products).toEqual([
      {
        detail: "Up to 3 months, 2× savings",
        loanType: "quick",
        name: "Quick financing",
        status: "created_at_go_live",
      },
      {
        detail: "Up to 18 months, 2× savings",
        loanType: "normal",
        name: "Normal financing",
        status: "created_at_go_live",
      },
    ])
  })

  test("explains why financing cannot open with no monthly commitments", () => {
    const summary = getGoLiveFinancingSummary(
      financing({
        canOpenAtGoLive: false,
        projectedCommitmentAmount: 0,
        totalCapacityAmount: 0,
      })
    )

    expect(summary.canOpenCycle).toBe(false)
    expect(summary.cycleLabel).toBe("November 2026 financing can't open yet.")
    expect(summary.cycleDetail).toContain("monthly commitments")
  })

  test("names the reserve when it absorbs all capacity", () => {
    const summary = getGoLiveFinancingSummary(
      financing({
        canOpenAtGoLive: false,
        reserveBufferAmount: 450_000,
        totalCapacityAmount: 0,
      })
    )

    expect(summary.cycleDetail).toContain("reserve covers all")
  })

  test("reports an existing cycle and existing or turned-off products", () => {
    const summary = getGoLiveFinancingSummary({
      ...financing({ canOpenAtGoLive: false, status: "open" }),
      products: {
        normal: product("normal", { exists: true, willCreate: false }),
        quick: product("quick", {
          exists: true,
          isActive: false,
          willCreate: false,
        }),
      },
    })

    expect(summary.canOpenCycle).toBe(false)
    expect(summary.cycleLabel).toBe("November 2026 financing is open.")
    expect(summary.products.map((line) => line.status)).toEqual([
      "turned_off",
      "ready",
    ])
  })
})
