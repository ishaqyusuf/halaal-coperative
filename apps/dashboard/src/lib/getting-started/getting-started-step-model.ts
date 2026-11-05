import type {
  TenantMigrationSetupSettings,
  TenantSharePolicySettings,
} from "@halaalvest/db"
import {
  getOnboardingJourneyStep,
  type InitialMigrationSnapshot,
  type InitialMigrationStatus,
  type OnboardingJourneyStepKey,
} from "@halaalvest/domain"
import type {
  GettingStartedStepKey,
  LegacyGettingStartedStepKey,
} from "@/hooks/use-getting-started-params"
import type { GettingStartedBusinessProfitSeasonRow } from "./getting-started-page-types"

// Setup steps (journey 5–9) in map order. `profit-seasons` is the conditional
// follow-on of step 8 and only appears when its existing rules apply.
const setupStepKeys = [
  "setup-mode",
  "operation-profile",
  "shares-charges",
  "profit",
  "profit-seasons",
  "review-setup",
] as const satisfies readonly GettingStartedStepKey[]

const legacyStepRedirects = {
  business: "profit",
  charges: "shares-charges",
  "profit-policy": "profit",
  shares: "shares-charges",
  "start-date": "setup-mode",
} satisfies Record<LegacyGettingStartedStepKey, GettingStartedStepKey>

const journeyStepByGettingStartedStep = {
  "admin-member": "add-members",
  "operation-profile": "operation-profile",
  profit: "profit",
  "profit-seasons": "profit",
  review: "go-live",
  "review-setup": "review-setup",
  "setup-mode": "setup-mode",
  "shares-charges": "shares-charges",
} satisfies Record<GettingStartedStepKey, OnboardingJourneyStepKey>

export function getJourneyStepKey(key: GettingStartedStepKey) {
  return journeyStepByGettingStartedStep[key]
}

export function getGettingStartedStepNumber(key: GettingStartedStepKey) {
  return getOnboardingJourneyStep(getJourneyStepKey(key)).number
}

export function resolveLegacyGettingStartedStep(
  key: string | null | undefined
): GettingStartedStepKey | null {
  return key && key in legacyStepRedirects
    ? legacyStepRedirects[key as LegacyGettingStartedStepKey]
    : null
}

const statusesPastHistoricalSetup: InitialMigrationStatus[] = [
  "member_migration_in_progress",
  "migration_review",
  "finalized",
  "live_operations",
]

// Read-time fallback for tenants created before the One Path confirmation
// timestamps existed: a step counts as confirmed when its timestamp is set, or
// when the tenant's setup had already progressed (operation profile reviewed,
// or status past historical_setup_in_progress). No data migration.
export function isSetupStepConfirmed(input: {
  confirmedAt: string | null | undefined
  operationProfileReviewed: boolean
  status: InitialMigrationStatus
}) {
  return (
    Boolean(input.confirmedAt) ||
    input.operationProfileReviewed ||
    statusesPastHistoricalSetup.includes(input.status)
  )
}

export type GettingStartedProgressInput = {
  businessPolicyId: string | null
  businessProfitSeasons: GettingStartedBusinessProfitSeasonRow[]
  migrationSetup: Pick<TenantMigrationSetupSettings, "confirmedAt" | "mode">
  operationProfileReviewedAt: Date | string | null | undefined
  sharePolicy: Pick<TenantSharePolicySettings, "confirmedAt">
  snapshot: Pick<
    InitialMigrationSnapshot,
    "canUseLiveFinancialWrites" | "missingStepKeys" | "status"
  >
}

export function shouldShowProfitSeasonsStep(
  input: Pick<
    GettingStartedProgressInput,
    "businessProfitSeasons" | "migrationSetup" | "snapshot"
  >,
  today = new Date().toISOString().slice(0, 10)
) {
  if (input.migrationSetup.mode === "brought_forward") {
    return input.businessProfitSeasons.some(
      (season) =>
        season.periodEnd < today &&
        season.profitEntries.some((entry) => entry.status === "pending")
    )
  }

  return (
    input.migrationSetup.mode === "historical_backfill" ||
    input.snapshot.missingStepKeys.includes("business_profit_seasons")
  )
}

export function getOrderedGettingStartedStepKeys(
  input: Pick<
    GettingStartedProgressInput,
    "businessProfitSeasons" | "migrationSetup" | "snapshot"
  >
): GettingStartedStepKey[] {
  return setupStepKeys.filter(
    (key) => key !== "profit-seasons" || shouldShowProfitSeasonsStep(input)
  )
}

// A step is Done only when its data is saved (One Path Done rules).
export function isGettingStartedStepComplete(
  key: GettingStartedStepKey,
  input: GettingStartedProgressInput
): boolean {
  const missing = new Set(input.snapshot.missingStepKeys)
  const isBroughtForward = input.migrationSetup.mode === "brought_forward"
  const operationProfileReviewed = Boolean(input.operationProfileReviewedAt)
  const confirmed = (confirmedAt: string | null | undefined) =>
    isSetupStepConfirmed({
      confirmedAt,
      operationProfileReviewed,
      status: input.snapshot.status,
    })

  switch (key) {
    case "setup-mode":
      return (
        confirmed(input.migrationSetup.confirmedAt) &&
        !missing.has("finance_start_date")
      )
    case "operation-profile":
      return operationProfileReviewed
    case "shares-charges":
      return (
        confirmed(input.sharePolicy.confirmedAt) &&
        !missing.has("charge_schedules")
      )
    case "profit":
      return (
        Boolean(input.businessPolicyId) &&
        (isBroughtForward || !missing.has("business_profit_pools"))
      )
    case "profit-seasons":
      return isBroughtForward || !missing.has("business_profit_seasons")
    case "review-setup":
      return getOrderedGettingStartedStepKeys(input)
        .filter((step) => step !== "review-setup")
        .every((step) => isGettingStartedStepComplete(step, input))
    case "admin-member":
      return (
        !missing.has("member_profiles") &&
        !missing.has("legacy_loans") &&
        !missing.has("member_ledger_backfill")
      )
    case "review":
      return input.snapshot.canUseLiveFinancialWrites
  }
}

// Resume lands on the first step that is not done, in map order.
export function resolveGettingStartedResumeStep(
  input: GettingStartedProgressInput
): GettingStartedStepKey {
  const firstIncomplete = getOrderedGettingStartedStepKeys(input).find(
    (key) => !isGettingStartedStepComplete(key, input)
  )

  if (firstIncomplete) return firstIncomplete

  return isGettingStartedStepComplete("admin-member", input)
    ? "review"
    : "admin-member"
}

export function getPreviousGettingStartedStep(
  key: GettingStartedStepKey,
  input: Pick<
    GettingStartedProgressInput,
    "businessProfitSeasons" | "migrationSetup" | "snapshot"
  >
): GettingStartedStepKey | null {
  const ordered = getOrderedGettingStartedStepKeys(input)
  const index = ordered.indexOf(key)

  if (key === "review") return "admin-member"
  if (key === "admin-member") return "review-setup"

  return index > 0 ? ordered[index - 1]! : null
}

export function getNextGettingStartedStep(
  key: GettingStartedStepKey,
  input: Pick<
    GettingStartedProgressInput,
    "businessProfitSeasons" | "migrationSetup" | "snapshot"
  >
): GettingStartedStepKey | null {
  const ordered = getOrderedGettingStartedStepKeys(input)
  const index = ordered.indexOf(key)

  if (key === "review-setup") return "admin-member"
  if (key === "admin-member") return "review"
  if (index < 0) return null

  return ordered[index + 1] ?? "admin-member"
}

export function formatGettingStartedDate(value: string | null) {
  if (!value) return "Not set"

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(`${value}T00:00:00.000Z`))
}

export function getGettingStartedStepHref(key: GettingStartedStepKey) {
  if (key === "admin-member") {
    return "/onboarding-success"
  }

  return `/getting-started?step=${key}`
}

export type OnePathRailStepModel = {
  href: string | null
  key: OnboardingJourneyStepKey
  state: "complete" | "current" | "upcoming"
}

// Dashboard rail state for all eleven journey steps. Steps 1–4 are done and
// locked once the workspace exists; a completed step is a link; step 10 opens
// once setup is done and step 11 once every member is ready.
export function buildOnePathRailSteps(
  input: GettingStartedProgressInput & { activeStep: GettingStartedStepKey }
): OnePathRailStepModel[] {
  const activeJourneyKey = getJourneyStepKey(input.activeStep)
  const setupDone = isGettingStartedStepComplete("review-setup", input)
  const membersReady =
    input.snapshot.status === "migration_review" ||
    isGettingStartedStepComplete("admin-member", input)
  const gettingStartedStepByJourney: Partial<
    Record<OnboardingJourneyStepKey, GettingStartedStepKey>
  > = {
    "add-members": "admin-member",
    "go-live": "review",
    "operation-profile": "operation-profile",
    profit: "profit",
    "review-setup": "review-setup",
    "setup-mode": "setup-mode",
    "shares-charges": "shares-charges",
  }
  const workspaceKeys: OnboardingJourneyStepKey[] = [
    "sign-up",
    "verify-email",
    "cooperative-details",
    "password",
  ]
  const allKeys: OnboardingJourneyStepKey[] = [
    ...workspaceKeys,
    "setup-mode",
    "operation-profile",
    "shares-charges",
    "profit",
    "review-setup",
    "add-members",
    "go-live",
  ]

  return allKeys.map((key) => {
    if (workspaceKeys.includes(key)) {
      return { href: null, key, state: "complete" as const }
    }

    const stepKey = gettingStartedStepByJourney[key]!
    const complete =
      key === "profit"
        ? isGettingStartedStepComplete("profit", input) &&
          (!getOrderedGettingStartedStepKeys(input).includes(
            "profit-seasons"
          ) ||
            isGettingStartedStepComplete("profit-seasons", input))
        : isGettingStartedStepComplete(stepKey, input)
    const state =
      key === activeJourneyKey ? "current" : complete ? "complete" : "upcoming"
    const reachable =
      key === "add-members"
        ? setupDone
        : key === "go-live"
          ? membersReady
          : complete

    return {
      href: reachable ? getGettingStartedStepHref(stepKey) : null,
      key,
      state,
    }
  })
}

function toSeasonDate(value: Date | string | null | undefined) {
  if (!value) return ""

  return value instanceof Date
    ? value.toISOString().slice(0, 10)
    : value.slice(0, 10)
}

// One mapping from the finance setup read model, shared by Getting Started
// and the members checklist so both apply the same Done rules.
export function toGettingStartedProgressInput(input: {
  financeSetup: {
    businessPolicy: { id: string | null }
    businessProfitSeasons: Array<{
      periodEnd: Date | string | null
      profitEntries?: Array<{ status?: string | null }> | null
    }>
    migrationSetup: GettingStartedProgressInput["migrationSetup"]
    sharePolicy: GettingStartedProgressInput["sharePolicy"]
  }
  operationProfileReviewedAt: Date | string | null | undefined
  snapshot: GettingStartedProgressInput["snapshot"]
}): GettingStartedProgressInput {
  return {
    businessPolicyId: input.financeSetup.businessPolicy.id,
    businessProfitSeasons: input.financeSetup.businessProfitSeasons.map(
      (season) => ({
        periodEnd: toSeasonDate(season.periodEnd),
        profitEntries: (season.profitEntries ?? []).map((entry) => ({
          status: entry.status ?? "draft",
        })),
      })
    ) as GettingStartedProgressInput["businessProfitSeasons"],
    migrationSetup: input.financeSetup.migrationSetup,
    operationProfileReviewedAt: input.operationProfileReviewedAt,
    sharePolicy: input.financeSetup.sharePolicy,
    snapshot: input.snapshot,
  }
}
