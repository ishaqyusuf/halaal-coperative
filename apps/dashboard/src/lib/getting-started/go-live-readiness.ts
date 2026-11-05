import type {
  InitialMigrationSnapshot,
  InitialMigrationStepKey,
} from "@halaalvest/domain"

/** Every readiness check shown before going live. `finalization` is the go-live itself. */
export type GoLiveReadinessKey = Exclude<InitialMigrationStepKey, "finalization">

export type GoLiveReadinessRow = {
  fixHref: string
  key: GoLiveReadinessKey
  label: string
  ready: boolean
}

const goLiveReadinessChecks = {
  migration_setup_mode: {
    fixHref: "/getting-started?step=setup-mode",
    label: "How you're bringing in records",
  },
  finance_start_date: {
    fixHref: "/getting-started?step=setup-mode",
    label: "Finance start date",
  },
  charge_schedules: {
    fixHref: "/getting-started?step=shares-charges",
    label: "Charges",
  },
  business_profit_pools: {
    fixHref: "/getting-started?step=profit",
    label: "Business profits",
  },
  business_profit_seasons: {
    fixHref: "/getting-started?step=profit-seasons",
    label: "Profit seasons",
  },
  share_capital_plan: {
    fixHref: "/getting-started?step=shares-charges",
    label: "Share plan",
  },
  member_profiles: {
    fixHref: "/onboarding-success",
    label: "Member profiles",
  },
  legacy_loans: {
    fixHref: "/onboarding-success",
    label: "Existing loans",
  },
  member_ledger_backfill: {
    fixHref: "/onboarding-success",
    label: "Member balances",
  },
} satisfies Record<GoLiveReadinessKey, { fixHref: string; label: string }>

/** Query flag the dashboard home reads to show the one-time "is live" banner. */
export const goLiveBannerParam = "live"
export const goLiveSuccessHref = `/?${goLiveBannerParam}=1`

function isGoLiveReadinessKey(
  key: InitialMigrationStepKey
): key is GoLiveReadinessKey {
  return key !== "finalization"
}

/**
 * Rows in snapshot step order. A row is Ready when its key is not in
 * `missingStepKeys`, which is the same rule the review step used before.
 */
export function getGoLiveReadinessRows(
  snapshot: Pick<InitialMigrationSnapshot, "missingStepKeys" | "steps">
): GoLiveReadinessRow[] {
  const missing = new Set(snapshot.missingStepKeys)

  return snapshot.steps.flatMap((step) => {
    if (!isGoLiveReadinessKey(step.key)) return []

    return [
      {
        ...goLiveReadinessChecks[step.key],
        key: step.key,
        ready: !missing.has(step.key),
      },
    ]
  })
}

/** Today's UI rule: no missing step other than `finalization`. */
export function isReadyToGoLive(
  snapshot: Pick<InitialMigrationSnapshot, "missingStepKeys">
) {
  return snapshot.missingStepKeys.every((key) => key === "finalization")
}

export function getGoLiveConfirmationLabel(tenantName: string) {
  return `I've checked the balances with our records. Start live operations for ${tenantName}.`
}

/** Where members sign in, e.g. `amanah.halaalvest.com` or `halaalvest.com/amanah`. */
export function formatMemberSignInHost(input: {
  externalBasePath?: string | null
  host: string | null | undefined
}) {
  const host = input.host?.trim()
  if (!host) return null

  const basePath = input.externalBasePath?.replace(/\/+$/, "") ?? ""

  return `${host}${basePath}`
}

export function getGoLiveBannerMessage(input: {
  signInHost: string | null
  tenantName: string
}) {
  return input.signInHost
    ? `${input.tenantName} is live. Members can sign in at ${input.signInHost} with their member code.`
    : `${input.tenantName} is live. Members can sign in with their member code.`
}
